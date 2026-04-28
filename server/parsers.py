import json
import os
import glob
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Any

CLAUDE_DIR = Path.home() / ".claude"
PROJECTS_DIR = CLAUDE_DIR / "projects"
HISTORY_FILE = CLAUDE_DIR / "history.jsonl"

PRICING: Dict[str, Dict[str, float]] = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.30},
    "claude-haiku-4-5": {"input": 0.80, "output": 4.0, "cache_write": 1.0, "cache_read": 0.08},
    "claude-opus-4-6": {"input": 15.0, "output": 75.0, "cache_write": 18.75, "cache_read": 1.50},
    "claude-opus-4-7": {"input": 15.0, "output": 75.0, "cache_write": 18.75, "cache_read": 1.50},
}
DEFAULT_PRICING = {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.30}

BUILTIN_TOOLS = {
    "Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "WebSearch",
    "Agent", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskStop", "TaskOutput",
    "ExitPlanMode", "EnterPlanMode", "AskUserQuestion", "Monitor", "ToolSearch",
    "NotebookEdit", "ListMcpResourcesTool", "ReadMcpResourceTool",
    "CronCreate", "CronDelete", "CronList", "PushNotification", "ScheduleWakeup",
    "RemoteTrigger", "Skill", "EnterWorktree", "ExitWorktree",
}

_SYSTEM_INJECTION_PREFIXES = (
    "<system-reminder", "<local-command-caveat", "<command-name", "<command-message",
    "<command-args", "Caveat:", "IMPORTANT:",
)


def get_pricing(model: str) -> Dict[str, float]:
    for key, pricing in PRICING.items():
        if key in model:
            return pricing
    return DEFAULT_PRICING


def compute_cost(usage: Dict[str, Any], model: str) -> float:
    p = get_pricing(model)
    return (
        usage.get("input_tokens", 0) * p["input"] / 1_000_000
        + usage.get("output_tokens", 0) * p["output"] / 1_000_000
        + usage.get("cache_creation_input_tokens", 0) * p["cache_write"] / 1_000_000
        + usage.get("cache_read_input_tokens", 0) * p["cache_read"] / 1_000_000
    )


def project_display_name(cwd: Optional[str], dir_name: str) -> str:
    if dir_name == "subagents":
        return "subagents (internal)"
    if cwd:
        home = str(Path.home())
        if cwd.startswith(home):
            return "~" + cwd[len(home):]
        return cwd
    return dir_name


def _is_system_text(text: str) -> bool:
    stripped = text.strip()
    return any(stripped.startswith(p) for p in _SYSTEM_INJECTION_PREFIXES) or stripped.startswith("<")


def _parse_tool_result(content: Any) -> str:
    """Extract readable text from a tool_result content block."""
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n".join(parts)[:12000]

    if isinstance(content, str):
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "result" in parsed:
                result = parsed["result"]
                try:
                    inner = json.loads(result) if isinstance(result, str) else result
                    return json.dumps(inner, indent=2)[:12000]
                except Exception:
                    return str(result)[:12000]
            return json.dumps(parsed, indent=2)[:12000]
        except Exception:
            return content[:12000]

    return str(content)[:12000]


def parse_all_sessions() -> Dict[str, Any]:
    sessions: Dict[str, Any] = {}

    for jsonl_path in glob.glob(str(PROJECTS_DIR / "**" / "*.jsonl"), recursive=True):
        path = Path(jsonl_path)
        project_dir = path.parent.name
        session_id = path.stem

        session: Dict[str, Any] = {
            "id": session_id,
            "project_dir": project_dir,
            "project_name": None,
            "messages": 0,
            "user_messages": 0,
            "assistant_messages": 0,
            "tool_calls": [],
            "tokens": {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0},
            "cost": 0.0,
            "models": set(),
            "first_ts": None,
            "last_ts": None,
            "last_prompt": None,
            "cwd": None,
            "version": None,
            "git_branch": None,
            "entrypoint": None,
            # New architecture fields
            "stop_reasons": defaultdict(int),
            "thinking_blocks": 0,
            "web_searches": 0,
            "web_fetches": 0,
            "file_edits": 0,
            "has_iterations": False,
            "speed": None,
            # Identity / session metadata
            "slug": None,
            "permission_modes": set(),
            "compact_count": 0,
            "api_errors": 0,
            "total_turn_ms": 0,
            # Full-text search corpus
            "_search_parts": [],
        }

        try:
            with open(jsonl_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    ts = rec.get("timestamp")
                    if ts:
                        if session["first_ts"] is None or ts < session["first_ts"]:
                            session["first_ts"] = ts
                        if session["last_ts"] is None or ts > session["last_ts"]:
                            session["last_ts"] = ts

                    rtype = rec.get("type")
                    subtype = rec.get("subtype")

                    # Capture slug from any record that has it
                    if not session["slug"] and rec.get("slug"):
                        session["slug"] = rec["slug"]

                    # System subtypes
                    if rtype == "system" and subtype:
                        if subtype == "compact_boundary":
                            session["compact_count"] += 1
                        elif subtype == "api_error":
                            session["api_errors"] += 1
                        elif subtype == "turn_duration":
                            session["total_turn_ms"] += rec.get("durationMs", 0)

                    if rtype == "permission-mode":
                        mode = rec.get("permissionMode")
                        if mode:
                            session["permission_modes"].add(mode)

                    if rtype == "file-history-snapshot":
                        snap = rec.get("snapshot", {})
                        edits = len(snap.get("trackedFileBackups", {}))
                        session["file_edits"] += edits

                    elif rtype == "user":
                        session["messages"] += 1
                        session["user_messages"] += 1
                        if not session["cwd"] and rec.get("cwd"):
                            session["cwd"] = rec["cwd"]
                        if not session["version"] and rec.get("version"):
                            session["version"] = rec["version"]
                        if not session["git_branch"] and rec.get("gitBranch"):
                            session["git_branch"] = rec["gitBranch"]
                        if not session["entrypoint"] and rec.get("entrypoint"):
                            session["entrypoint"] = rec["entrypoint"]

                        if not rec.get("isMeta"):
                            content = rec.get("message", {}).get("content", "")
                            if isinstance(content, str) and content.strip() and not _is_system_text(content):
                                session["_search_parts"].append(content[:3000])
                            elif isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict) and block.get("type") == "text":
                                        text = block.get("text", "")
                                        if text.strip() and not _is_system_text(text):
                                            session["_search_parts"].append(text[:2000])

                    elif rtype == "assistant":
                        session["messages"] += 1
                        session["assistant_messages"] += 1
                        msg = rec.get("message", {})
                        model = msg.get("model", "")
                        if model and model not in ("<synthetic>", ""):
                            session["models"].add(model)

                        usage = msg.get("usage", {})
                        session["tokens"]["input"] += usage.get("input_tokens", 0)
                        session["tokens"]["output"] += usage.get("output_tokens", 0)
                        session["tokens"]["cache_read"] += usage.get("cache_read_input_tokens", 0)
                        session["tokens"]["cache_creation"] += usage.get("cache_creation_input_tokens", 0)
                        session["cost"] += compute_cost(usage, model)

                        stop_reason = msg.get("stop_reason", "")
                        if stop_reason:
                            session["stop_reasons"][stop_reason] += 1

                        server_tools = usage.get("server_tool_use", {})
                        session["web_searches"] += server_tools.get("web_search_requests", 0)
                        session["web_fetches"] += server_tools.get("web_fetch_requests", 0)

                        if usage.get("iterations"):
                            session["has_iterations"] = True

                        speed = usage.get("speed")
                        if speed and not session["speed"]:
                            session["speed"] = speed

                        for content in msg.get("content", []):
                            if not isinstance(content, dict):
                                continue
                            ctype = content.get("type")
                            if ctype == "thinking":
                                session["thinking_blocks"] += 1
                                thinking = content.get("thinking", "")
                                if thinking:
                                    session["_search_parts"].append(thinking[:400])
                            elif ctype == "text":
                                text = content.get("text", "")
                                if text.strip():
                                    session["_search_parts"].append(text[:1000])
                            elif ctype == "tool_use":
                                name = content.get("name", "unknown")
                                session["tool_calls"].append({"name": name, "ts": ts})
                                session["_search_parts"].append(name)

                    elif rtype == "last-prompt":
                        session["last_prompt"] = rec.get("lastPrompt", "")

        except Exception:
            pass

        session["models"] = list(session["models"])
        session["tool_count"] = len(session["tool_calls"])
        session["stop_reasons"] = dict(session["stop_reasons"])
        session["permission_modes"] = list(session["permission_modes"])
        session["full_text"] = " ".join(session["_search_parts"])[:25000]
        del session["_search_parts"]
        session["project_name"] = project_display_name(session["cwd"], project_dir)
        # Count subagents from the subagents/ dir
        subagents_dir = path.parent / session_id / "subagents"
        if subagents_dir.exists():
            session["subagent_count"] = len(list(subagents_dir.glob("*.json")))
        else:
            session["subagent_count"] = 0
        sessions[session_id] = session

    return sessions


def get_session_detail(session_id: str) -> Optional[Dict[str, Any]]:
    """Return full conversation detail for a session."""
    jsonl_path = None
    for p in glob.glob(str(PROJECTS_DIR / "**" / f"{session_id}.jsonl"), recursive=True):
        jsonl_path = p
        break

    if not jsonl_path:
        return None

    messages = []
    meta: Dict[str, Any] = {}

    try:
        with open(jsonl_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue

                rtype = rec.get("type")
                ts = rec.get("timestamp")
                is_meta = rec.get("isMeta", False)

                if rtype == "permission-mode":
                    meta["permission_mode"] = rec.get("permissionMode")

                elif rtype == "user" and not is_meta:
                    content = rec.get("message", {}).get("content", "")

                    if isinstance(content, str):
                        if content.strip() and not _is_system_text(content):
                            messages.append({
                                "role": "user",
                                "type": "text",
                                "content": content,
                                "timestamp": ts,
                            })

                    elif isinstance(content, list):
                        for block in content:
                            if not isinstance(block, dict):
                                continue
                            btype = block.get("type")

                            if btype == "text":
                                text = block.get("text", "")
                                if text.strip() and not _is_system_text(text):
                                    messages.append({
                                        "role": "user",
                                        "type": "text",
                                        "content": text,
                                        "timestamp": ts,
                                    })

                            elif btype == "tool_result":
                                messages.append({
                                    "role": "user",
                                    "type": "tool_result",
                                    "tool_use_id": block.get("tool_use_id", ""),
                                    "content": _parse_tool_result(block.get("content", "")),
                                    "is_error": block.get("is_error", False),
                                    "timestamp": ts,
                                })

                elif rtype == "assistant":
                    msg = rec.get("message", {})
                    model = msg.get("model", "")
                    stop_reason = msg.get("stop_reason", "")
                    usage = msg.get("usage", {})
                    usage_summary = {
                        "input": usage.get("input_tokens", 0),
                        "output": usage.get("output_tokens", 0),
                        "cache_read": usage.get("cache_read_input_tokens", 0),
                        "cache_creation": usage.get("cache_creation_input_tokens", 0),
                    }

                    for content in msg.get("content", []):
                        if not isinstance(content, dict):
                            continue
                        ctype = content.get("type")

                        if ctype == "thinking":
                            messages.append({
                                "role": "assistant",
                                "type": "thinking",
                                "content": content.get("thinking", ""),
                                "timestamp": ts,
                                "model": model,
                            })

                        elif ctype == "text":
                            messages.append({
                                "role": "assistant",
                                "type": "text",
                                "content": content.get("text", ""),
                                "timestamp": ts,
                                "model": model,
                                "stop_reason": stop_reason,
                                "usage": usage_summary,
                            })

                        elif ctype == "tool_use":
                            messages.append({
                                "role": "assistant",
                                "type": "tool_use",
                                "tool_name": content.get("name", ""),
                                "tool_id": content.get("id", ""),
                                "tool_input": content.get("input", {}),
                                "timestamp": ts,
                                "model": model,
                            })

    except Exception:
        pass

    return {
        "session_id": session_id,
        "messages": messages,
        "message_count": len(messages),
        "meta": meta,
    }


def get_overview(sessions: Dict[str, Any]) -> Dict[str, Any]:
    total_in = sum(s["tokens"]["input"] for s in sessions.values())
    total_out = sum(s["tokens"]["output"] for s in sessions.values())
    total_cache_read = sum(s["tokens"]["cache_read"] for s in sessions.values())
    total_cache_creation = sum(s["tokens"]["cache_creation"] for s in sessions.values())
    total_cost = sum(s["cost"] for s in sessions.values())
    total_tools = sum(s["tool_count"] for s in sessions.values())

    all_ts = [s["first_ts"] for s in sessions.values() if s["first_ts"]]
    all_ts += [s["last_ts"] for s in sessions.values() if s["last_ts"]]

    projects = set(s["project_dir"] for s in sessions.values())
    cache_total = total_cache_read + total_cache_creation
    cache_efficiency = (total_cache_read / cache_total * 100) if cache_total > 0 else 0

    # Architecture insights
    stop_reasons: Dict[str, int] = defaultdict(int)
    entrypoints: Dict[str, int] = defaultdict(int)
    versions: Dict[str, int] = defaultdict(int)
    total_thinking = 0
    total_web_searches = 0
    total_web_fetches = 0
    total_file_edits = 0
    sidechain_count = 0

    for s in sessions.values():
        for reason, count in s.get("stop_reasons", {}).items():
            stop_reasons[reason] += count
        if s.get("entrypoint"):
            entrypoints[s["entrypoint"]] += 1
        if s.get("version"):
            versions[s["version"]] += 1
        total_thinking += s.get("thinking_blocks", 0)
        total_web_searches += s.get("web_searches", 0)
        total_web_fetches += s.get("web_fetches", 0)
        total_file_edits += s.get("file_edits", 0)

    all_tool_names: set = set()
    for s in sessions.values():
        for tc in s["tool_calls"]:
            all_tool_names.add(tc["name"])

    return {
        "total_sessions": len(sessions),
        "total_projects": len(projects),
        "total_messages": sum(s["messages"] for s in sessions.values()),
        "total_tool_calls": total_tools,
        "unique_tools": len(all_tool_names),
        "total_tokens_in": total_in,
        "total_tokens_out": total_out,
        "total_cache_read": total_cache_read,
        "total_cache_creation": total_cache_creation,
        "total_cost": round(total_cost, 4),
        "cache_efficiency": round(cache_efficiency, 1),
        "first_activity": min(all_ts) if all_ts else None,
        "last_activity": max(all_ts) if all_ts else None,
        # Architecture insights
        "stop_reasons": dict(stop_reasons),
        "entrypoints": dict(entrypoints),
        "versions": dict(versions),
        "total_thinking_blocks": total_thinking,
        "total_web_searches": total_web_searches,
        "total_web_fetches": total_web_fetches,
        "total_file_edits": total_file_edits,
    }


def get_projects(sessions: Dict[str, Any]) -> List[Dict[str, Any]]:
    projects: Dict[str, Any] = defaultdict(lambda: {
        "sessions": 0, "messages": 0, "tool_calls": 0,
        "tokens_in": 0, "tokens_out": 0, "cache_read": 0, "cache_creation": 0,
        "cost": 0.0, "models": set(), "first_ts": None, "last_ts": None, "memory_count": 0,
        "thinking_blocks": 0, "web_searches": 0,
    })

    for s in sessions.values():
        pd = s["project_dir"]
        p = projects[pd]
        p["project_dir"] = pd
        p["project_name"] = s["project_name"]
        p["sessions"] += 1
        p["messages"] += s["messages"]
        p["tool_calls"] += s["tool_count"]
        p["tokens_in"] += s["tokens"]["input"]
        p["tokens_out"] += s["tokens"]["output"]
        p["cache_read"] += s["tokens"]["cache_read"]
        p["cache_creation"] += s["tokens"]["cache_creation"]
        p["cost"] += s["cost"]
        p["models"].update(s["models"])
        p["thinking_blocks"] += s.get("thinking_blocks", 0)
        p["web_searches"] += s.get("web_searches", 0)
        if s["first_ts"]:
            if p["first_ts"] is None or s["first_ts"] < p["first_ts"]:
                p["first_ts"] = s["first_ts"]
        if s["last_ts"]:
            if p["last_ts"] is None or s["last_ts"] > p["last_ts"]:
                p["last_ts"] = s["last_ts"]

    for proj_dir, p in projects.items():
        mem_dir = PROJECTS_DIR / proj_dir / "memory"
        if mem_dir.exists():
            md_files = list(mem_dir.glob("*.md"))
            p["memory_count"] = max(0, len(md_files) - 1)

    result = []
    for p in projects.values():
        p["models"] = sorted(p["models"])
        cache_total = p["cache_read"] + p["cache_creation"]
        p["cache_efficiency"] = round((p["cache_read"] / cache_total * 100) if cache_total > 0 else 0, 1)
        p["cost"] = round(p["cost"], 4)
        result.append(dict(p))

    return sorted(result, key=lambda x: -x["cost"])


def get_tools(sessions: Dict[str, Any]) -> Dict[str, Any]:
    tool_counts: Dict[str, int] = defaultdict(int)
    tool_by_project: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for s in sessions.values():
        pname = s["project_name"] or s["project_dir"]
        for tc in s["tool_calls"]:
            name = tc["name"]
            tool_counts[name] += 1
            tool_by_project[pname][name] += 1

    tools_list = []
    for name, count in sorted(tool_counts.items(), key=lambda x: -x[1]):
        category = "builtin" if name in BUILTIN_TOOLS else "mcp"
        display_name = name
        if name.startswith("mcp__"):
            parts = name.split("__")
            if len(parts) >= 3:
                display_name = f"{parts[1]}/{parts[2]}"
        tools_list.append({"name": name, "display_name": display_name, "count": count, "category": category})

    return {
        "tools": tools_list,
        "by_project": {k: dict(v) for k, v in tool_by_project.items()},
        "total_unique": len(tool_counts),
        "total_calls": sum(tool_counts.values()),
        "mcp_calls": sum(v for k, v in tool_counts.items() if k not in BUILTIN_TOOLS),
        "builtin_calls": sum(v for k, v in tool_counts.items() if k in BUILTIN_TOOLS),
    }


def get_timeline(sessions: Dict[str, Any]) -> List[Dict[str, Any]]:
    daily: Dict[str, Any] = defaultdict(lambda: {
        "tokens_in": 0, "tokens_out": 0, "cache_read": 0,
        "cache_creation": 0, "cost": 0.0, "tool_calls": 0, "sessions": 0,
    })

    for s in sessions.values():
        date = (s["first_ts"] or "")[:10]
        if not date:
            continue
        d = daily[date]
        d["tokens_in"] += s["tokens"]["input"]
        d["tokens_out"] += s["tokens"]["output"]
        d["cache_read"] += s["tokens"]["cache_read"]
        d["cache_creation"] += s["tokens"]["cache_creation"]
        d["cost"] += s["cost"]
        d["tool_calls"] += s["tool_count"]
        d["sessions"] += 1

    result = []
    for date, data in sorted(daily.items()):
        data["cost"] = round(data["cost"], 4)
        result.append({"date": date, **data})
    return result


def get_activity_heatmap(sessions: Dict[str, Any]) -> List[Dict[str, Any]]:
    daily: Dict[str, int] = defaultdict(int)
    for s in sessions.values():
        date = (s["first_ts"] or "")[:10]
        if date:
            daily[date] += s["messages"]
    return [{"date": k, "count": v} for k, v in sorted(daily.items())]


def get_memory_files() -> List[Dict[str, Any]]:
    memories = []
    for mem_dir in PROJECTS_DIR.glob("*/memory"):
        if not mem_dir.is_dir():
            continue
        project_dir = mem_dir.parent.name
        for md_file in mem_dir.glob("*.md"):
            if md_file.name == "MEMORY.md":
                continue
            try:
                raw = md_file.read_text(encoding="utf-8")
                mem_type = "unknown"
                name = md_file.stem
                description = ""
                body = raw

                if raw.startswith("---"):
                    parts = raw.split("---", 2)
                    if len(parts) >= 3:
                        fm, body = parts[1], parts[2].strip()
                        for line in fm.strip().splitlines():
                            if line.startswith("type:"):
                                mem_type = line.split(":", 1)[1].strip()
                            elif line.startswith("name:"):
                                name = line.split(":", 1)[1].strip()
                            elif line.startswith("description:"):
                                description = line.split(":", 1)[1].strip()

                memories.append({
                    "project_dir": project_dir,
                    "file": md_file.name,
                    "name": name,
                    "type": mem_type,
                    "description": description,
                    "content": body[:600],
                    "modified": md_file.stat().st_mtime,
                })
            except Exception:
                pass

    return sorted(memories, key=lambda x: -x["modified"])


def get_sessions_list(sessions: Dict[str, Any]) -> List[Dict[str, Any]]:
    result = []
    for s_id, s in sessions.items():
        tools_summary: Dict[str, int] = defaultdict(int)
        for tc in s["tool_calls"]:
            tools_summary[tc["name"]] += 1

        result.append({
            "id": s_id,
            "project_name": s["project_name"],
            "project_dir": s["project_dir"],
            "messages": s["messages"],
            "tool_count": s["tool_count"],
            "top_tools": sorted(tools_summary.items(), key=lambda x: -x[1])[:5],
            "cost": round(s["cost"], 4),
            "tokens_in": s["tokens"]["input"],
            "tokens_out": s["tokens"]["output"],
            "cache_read": s["tokens"]["cache_read"],
            "first_ts": s["first_ts"],
            "last_ts": s["last_ts"],
            "last_prompt": s["last_prompt"],
            "models": s["models"],
            "version": s["version"],
            "git_branch": s["git_branch"],
            "entrypoint": s["entrypoint"],
            # Architecture fields
            "thinking_blocks": s.get("thinking_blocks", 0),
            "web_searches": s.get("web_searches", 0),
            "web_fetches": s.get("web_fetches", 0),
            "stop_reasons": s.get("stop_reasons", {}),
            "full_text": s.get("full_text", ""),
            # Session identity / health
            "slug": s.get("slug"),
            "permission_modes": s.get("permission_modes", []),
            "compact_count": s.get("compact_count", 0),
            "api_errors": s.get("api_errors", 0),
            "subagent_count": s.get("subagent_count", 0),
            "total_turn_ms": s.get("total_turn_ms", 0),
        })

    return sorted(result, key=lambda x: x.get("last_ts") or "", reverse=True)


def get_models(sessions: Dict[str, Any]) -> Dict[str, Any]:
    model_stats: Dict[str, Any] = defaultdict(lambda: {
        "sessions": 0, "tokens_in": 0, "tokens_out": 0,
        "cache_read": 0, "cost": 0.0, "tool_calls": 0,
    })

    for s in sessions.values():
        models = s["models"] if s["models"] else ["unknown"]
        share = 1 / len(models)
        for m in models:
            ms = model_stats[m]
            ms["sessions"] += 1
            ms["tokens_in"] += int(s["tokens"]["input"] * share)
            ms["tokens_out"] += int(s["tokens"]["output"] * share)
            ms["cache_read"] += int(s["tokens"]["cache_read"] * share)
            ms["cost"] += s["cost"] * share
            ms["tool_calls"] += int(s["tool_count"] * share)

    for v in model_stats.values():
        v["cost"] = round(v["cost"], 4)

    return dict(model_stats)


def get_config() -> Dict[str, Any]:
    """Parse ~/.claude/.claude.json backup + settings.json + plugins directory."""
    backup_dir = CLAUDE_DIR / "backups"
    claude_json: Dict[str, Any] = {}
    if backup_dir.exists():
        backups = sorted(backup_dir.glob(".claude.json.backup.*"))
        if backups:
            try:
                with open(backups[-1], encoding="utf-8") as f:
                    claude_json = json.load(f)
            except Exception:
                pass

    # Global MCP servers
    global_mcp: List[Dict[str, Any]] = []
    for name, cfg in claude_json.get("mcpServers", {}).items():
        transport = "http" if cfg.get("url") else cfg.get("type", "stdio")
        global_mcp.append({
            "name": name,
            "transport": transport,
            "command": cfg.get("command") or cfg.get("url", ""),
            "args": cfg.get("args", []),
            "scope": "global",
        })

    # Per-project config (allowedTools + project-specific MCP)
    projects_config: List[Dict[str, Any]] = []
    for proj_path, proj_data in claude_json.get("projects", {}).items():
        allowed_tools = proj_data.get("allowedTools", [])
        proj_mcp: List[Dict[str, Any]] = []
        for name, cfg in proj_data.get("mcpServers", {}).items():
            transport = "http" if cfg.get("url") else cfg.get("type", "stdio")
            proj_mcp.append({
                "name": name,
                "transport": transport,
                "command": cfg.get("command") or cfg.get("url", ""),
                "args": cfg.get("args", []),
                "scope": "project",
            })
        last_model_usage = proj_data.get("lastModelUsage", {})
        projects_config.append({
            "path": proj_path,
            "name": os.path.basename(proj_path) or proj_path,
            "allowed_tools": allowed_tools,
            "mcp_servers": proj_mcp,
            "last_cost": proj_data.get("lastCost"),
            "last_lines_added": proj_data.get("lastLinesAdded"),
            "last_lines_removed": proj_data.get("lastLinesRemoved"),
            "last_api_duration_ms": proj_data.get("lastAPIDuration"),
            "last_model_usage": last_model_usage,
        })
    projects_config.sort(key=lambda x: -(x.get("last_cost") or 0))

    # Installed plugins from marketplace
    installed_plugins: List[Dict[str, Any]] = []
    plugins_dir = CLAUDE_DIR / "plugins" / "marketplaces"
    if plugins_dir.exists():
        for marketplace in plugins_dir.iterdir():
            ext_dir = marketplace / "external_plugins"
            if not ext_dir.exists():
                continue
            for plugin_dir in ext_dir.iterdir():
                mcp_file = plugin_dir / ".mcp.json"
                plugin_info: Dict[str, Any] = {
                    "name": plugin_dir.name,
                    "marketplace": marketplace.name,
                    "transport": "unknown",
                    "command": "",
                }
                if mcp_file.exists():
                    try:
                        with open(mcp_file, encoding="utf-8") as f:
                            mcp_cfg = json.load(f)
                        servers = mcp_cfg.get("mcpServers", {})
                        if servers:
                            first = next(iter(servers.values()))
                            plugin_info["transport"] = "http" if first.get("url") else first.get("type", "stdio")
                            plugin_info["command"] = first.get("command") or first.get("url", "")
                    except Exception:
                        pass
                installed_plugins.append(plugin_info)
    installed_plugins.sort(key=lambda x: x["name"])

    # Skill usage
    skill_usage: List[Dict[str, Any]] = []
    for skill_name, stats in claude_json.get("skillUsage", {}).items():
        skill_usage.append({
            "name": skill_name,
            "usage_count": stats.get("usageCount", 0),
            "last_used_at": stats.get("lastUsedAt"),
        })
    skill_usage.sort(key=lambda x: -x["usage_count"])

    # Global settings (never expose API key)
    global_settings: Dict[str, Any] = {
        "num_startups": claude_json.get("numStartups"),
        "install_method": claude_json.get("installMethod"),
        "theme": claude_json.get("theme"),
        "auto_updates": claude_json.get("autoUpdates"),
        "first_start_time": claude_json.get("firstStartTime"),
        "last_release_notes_seen": claude_json.get("lastReleaseNotesSeen"),
        "show_spinner_tree": claude_json.get("showSpinnerTree"),
    }
    settings_file = CLAUDE_DIR / "settings.json"
    if settings_file.exists():
        try:
            with open(settings_file, encoding="utf-8") as f:
                settings = json.load(f)
            env = settings.get("env", {})
            global_settings["model_config"] = {
                "base_url": env.get("ANTHROPIC_BASE_URL", ""),
                "default_model": env.get("ANTHROPIC_MODEL", ""),
                "opus_model": env.get("ANTHROPIC_DEFAULT_OPUS_MODEL", ""),
                "sonnet_model": env.get("ANTHROPIC_DEFAULT_SONNET_MODEL", ""),
                "haiku_model": env.get("ANTHROPIC_DEFAULT_HAIKU_MODEL", ""),
            }
            global_settings["theme"] = settings.get("theme", global_settings["theme"])
        except Exception:
            pass

    return {
        "global_mcp_servers": global_mcp,
        "projects": projects_config,
        "installed_plugins": installed_plugins,
        "skill_usage": skill_usage,
        "global_settings": global_settings,
    }


def get_live_sessions() -> List[Dict[str, Any]]:
    """Read ~/.claude/sessions/*.json for currently running Claude Code processes."""
    sessions_dir = CLAUDE_DIR / "sessions"
    result: List[Dict[str, Any]] = []
    if not sessions_dir.exists():
        return result

    for session_file in sessions_dir.glob("*.json"):
        try:
            with open(session_file, encoding="utf-8") as f:
                data = json.load(f)
            pid = data.get("pid")
            is_alive = False
            if pid:
                try:
                    os.kill(int(pid), 0)
                    is_alive = True
                except (ProcessLookupError, PermissionError, OSError):
                    is_alive = False
                except Exception:
                    # Windows raises ValueError for signal 0; fall back gracefully
                    is_alive = True
            result.append({
                "pid": pid,
                "session_id": data.get("sessionId", ""),
                "cwd": data.get("cwd", ""),
                "started_at": data.get("startedAt"),
                "version": data.get("version", ""),
                "kind": data.get("kind", "interactive"),
                "entrypoint": data.get("entrypoint", "cli"),
                "status": data.get("status", ""),
                "waiting_for": data.get("waitingFor"),
                "updated_at": data.get("updatedAt"),
                "is_alive": is_alive,
            })
        except Exception:
            pass

    return sorted(result, key=lambda x: x.get("started_at") or 0, reverse=True)


def get_history() -> List[Dict[str, Any]]:
    result = []
    if not HISTORY_FILE.exists():
        return result
    try:
        with open(HISTORY_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                    result.append({
                        "display": rec.get("display", ""),
                        "project": rec.get("project", ""),
                        "session_id": rec.get("sessionId", ""),
                        "timestamp": rec.get("timestamp"),
                    })
                except Exception:
                    pass
    except Exception:
        pass
    return sorted(result, key=lambda x: x.get("timestamp") or 0, reverse=True)
