import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from parsers import (
    parse_all_sessions,
    get_session_detail,
    get_overview,
    get_projects,
    get_tools,
    get_timeline,
    get_activity_heatmap,
    get_memory_files,
    get_sessions_list,
    get_models,
    get_history,
    get_config,
    get_live_sessions,
)

app = FastAPI(title="Claude Visibility API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict = {}
_cache_time: float = 0
CACHE_TTL = 30


def _sessions():
    global _cache, _cache_time
    now = time.time()
    if now - _cache_time > CACHE_TTL or not _cache:
        _cache = parse_all_sessions()
        _cache_time = now
    return _cache


@app.get("/api/overview")
def api_overview():
    return get_overview(_sessions())


@app.get("/api/projects")
def api_projects():
    return get_projects(_sessions())


@app.get("/api/tools")
def api_tools():
    return get_tools(_sessions())


@app.get("/api/timeline")
def api_timeline():
    return get_timeline(_sessions())


@app.get("/api/activity")
def api_activity():
    return get_activity_heatmap(_sessions())


@app.get("/api/memory")
def api_memory():
    return get_memory_files()


@app.get("/api/sessions")
def api_sessions():
    return get_sessions_list(_sessions())


@app.get("/api/sessions/{session_id}")
def api_session_detail(session_id: str):
    detail = get_session_detail(session_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


@app.get("/api/models")
def api_models():
    return get_models(_sessions())


@app.get("/api/history")
def api_history():
    return get_history()


@app.get("/api/config")
def api_config():
    return get_config()


@app.get("/api/live")
def api_live():
    return get_live_sessions()


@app.get("/health")
def health():
    return {"status": "ok", "cache_age_seconds": round(time.time() - _cache_time, 1)}
