<div align="center">

# 🔭 Claude Code Visibility

**A local analytics dashboard that turns your Claude Code usage into actionable intelligence.**

*Know your costs. Understand your patterns. Run it in 30 seconds.*

[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-3776ab?logo=python&logoColor=white)](https://python.org)
[![Node 18+](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

<video src="https://github.com/user-attachments/assets/e1798803-3793-440a-94f4-ed164264d4e8" autoplay loop muted playsinline width="100%"></video>

</div>

---

## What questions does this answer?

Most people running Claude Code have no visibility into how they're actually using it. This dashboard changes that.

### For individual developers

| Question | Where to find it |
|---|---|
| How much am I spending per day / week / month? | Overview → Daily Cost chart |
| Which project is costing the most? | Projects page |
| Am I getting value from the prompt cache? | Overview → Cache Efficiency |
| What tools does Claude actually use in my sessions? | Tools page |
| What was Claude doing in that session last Tuesday? | Sessions → full-text search |
| Is Claude doing real autonomous work or just answering questions? | Overview → Agentic Ratio |
| Which sessions used extended thinking? | Sessions → expanded card |

### For engineering leaders

| Question | Where to find it |
|---|---|
| What is our total AI tooling investment this month? | Overview → Total Cost |
| Which codebases are seeing the most AI activity? | Projects page |
| Are developers doing agentic work or simple Q&A? | Overview → Agentic Ratio (tool_use : end_turn) |
| What MCP servers and external tools are wired up? | Config page |
| How many Claude Code sessions are running right now? | Config → Live Sessions |
| What version of Claude Code is the team on? | Overview → Architecture Insights |
| Are sessions failing due to API errors? | Sessions → ⚠ badge |

---

## Features at a glance

<table>
<tr>
<td width="50%">

### 💰 Cost & Token Analytics
- Total spend with per-session and per-project breakdown
- Daily cost and token trend charts
- Cache efficiency — see how much you save from prompt caching
- Input / output / cache read / cache write split

### 🗂 Session Explorer
- Full-text search across **entire conversation history**
- Filter by project, sort by cost / recency / tool count
- Per-session: models used, git branch, permission mode (default / plan / auto)
- Compaction count, subagent spawns, API errors, turn time

### 🔧 Tool Usage
- Every tool ranked by call count
- MCP tools vs built-in tools split
- Which tools drive the most cost

</td>
<td width="50%">

### 📁 Projects
- Session count, total cost, top tools per project
- Line change tracking (added / removed)
- Last active timestamp

### 🧠 Architecture Insights
- **Agentic ratio** — tool_use : end_turn tells you how autonomous vs conversational your usage is
- Stop reason distribution (tool_use / end_turn / other)
- Entrypoint breakdown (CLI, IDE extension, API)
- Claude Code version distribution
- Extended thinking blocks, web searches, file edits

### ⚙️ Config & Infrastructure
- All global and per-project MCP servers with transport type
- Installed marketplace plugins
- Skill usage history
- Live session monitor with PID, status, uptime
- Per-project `allowedTools` (Always Allow list)

</td>
</tr>
</table>

### 🔥 Activity Heatmap
GitHub-style commit heatmap showing your Claude Code usage intensity over the past 4 months.

---

## Quickstart

**Prerequisites:** Python 3.9+, Node 18+, [Claude Code](https://claude.ai/code) installed and used at least once.

```bash
git clone https://github.com/your-username/claude-visibility.git
cd claude-visibility
./start.sh
```

That's it. The script installs all dependencies and opens:

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:8000 |

> **Windows users:** Run the backend and frontend manually (see below).

<details>
<summary>Manual startup (Windows or advanced)</summary>

```bash
# Terminal 1 — backend
cd server
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — frontend
cd dashboard
npm install
npm run dev
```

</details>

---

## How it works

```
~/.claude/projects/**/*.jsonl   ← Claude Code writes all session data here
~/.claude/backups/.claude.json  ← config, MCP servers, allowedTools
~/.claude/sessions/*.json       ← live process state

        ↓  parsed by

server/parsers.py  (Python / FastAPI)
        ↓  served as JSON at localhost:8000

dashboard/  (React / Vite / Recharts)
        ↓  rendered at localhost:5173
```

No data ever leaves your machine. Everything reads directly from your local `~/.claude/` directory.

---

## What Claude Code data is available?

Claude Code writes a detailed JSONL log for every session. This dashboard surfaces:

- **Every message** — user prompts, assistant responses, tool calls and results
- **Token counts** — input, output, cache read, cache creation per message
- **Model used** — per message (sessions can switch models)
- **Tool calls** — name, input, output, success/failure
- **Stop reasons** — why Claude paused (`tool_use`, `end_turn`, `max_tokens`)
- **Thinking blocks** — when extended thinking was active
- **Session metadata** — slug, git branch, permission mode, Claude Code version, entrypoint
- **Compaction events** — when the context window was auto-compacted
- **API errors** — connection failures logged per session

---

## Platform support

| Platform | Status |
|---|---|
| macOS | ✅ Full support |
| Linux | ✅ Full support |
| Windows | ⚠️ Manual startup required; live session detection limited |

---

## Contributing

Pull requests welcome. The two files that matter most:

- `server/parsers.py` — all data parsing logic
- `dashboard/src/pages/` — one file per page

If you add a new metric to the parser, add the type to `dashboard/src/types.ts` and it will flow through automatically.

---

## License

MIT — do whatever you want with it.

---

<div align="center">
<sub>Built for Claude Code power users who want to see inside the black box.</sub>
</div>
