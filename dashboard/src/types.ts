export interface Overview {
  total_sessions: number
  total_projects: number
  total_messages: number
  total_tool_calls: number
  unique_tools: number
  total_tokens_in: number
  total_tokens_out: number
  total_cache_read: number
  total_cache_creation: number
  total_cost: number
  cache_efficiency: number
  first_activity: string | null
  last_activity: string | null
  // Architecture insights
  stop_reasons: Record<string, number>
  entrypoints: Record<string, number>
  versions: Record<string, number>
  total_thinking_blocks: number
  total_web_searches: number
  total_web_fetches: number
  total_file_edits: number
}

export interface Project {
  project_dir: string
  project_name: string
  sessions: number
  messages: number
  tool_calls: number
  tokens_in: number
  tokens_out: number
  cache_read: number
  cache_creation: number
  cost: number
  models: string[]
  first_ts: string | null
  last_ts: string | null
  cache_efficiency: number
  memory_count: number
  thinking_blocks: number
  web_searches: number
}

export interface Tool {
  name: string
  display_name: string
  count: number
  category: 'builtin' | 'mcp'
}

export interface ToolsData {
  tools: Tool[]
  by_project: Record<string, Record<string, number>>
  total_unique: number
  total_calls: number
  mcp_calls: number
  builtin_calls: number
}

export interface TimelinePoint {
  date: string
  tokens_in: number
  tokens_out: number
  cache_read: number
  cache_creation: number
  cost: number
  tool_calls: number
  sessions: number
}

export interface ActivityDay {
  date: string
  count: number
}

export interface MemoryFile {
  project_dir: string
  file: string
  name: string
  type: string
  description: string
  content: string
  modified: number
}

export interface Session {
  id: string
  project_name: string
  project_dir: string
  messages: number
  tool_count: number
  top_tools: [string, number][]
  cost: number
  tokens_in: number
  tokens_out: number
  cache_read: number
  first_ts: string | null
  last_ts: string | null
  last_prompt: string | null
  models: string[]
  version: string | null
  git_branch: string | null
  entrypoint: string | null
  thinking_blocks: number
  web_searches: number
  web_fetches: number
  stop_reasons: Record<string, number>
  full_text: string
  // New session identity fields
  slug: string | null
  permission_modes: string[]
  compact_count: number
  api_errors: number
  subagent_count: number
  total_turn_ms: number
}

export interface McpServer {
  name: string
  transport: string
  command: string
  args: string[]
  scope: 'global' | 'project'
}

export interface ProjectConfig {
  path: string
  name: string
  allowed_tools: string[]
  mcp_servers: McpServer[]
  last_cost: number | null
  last_lines_added: number | null
  last_lines_removed: number | null
  last_api_duration_ms: number | null
  last_model_usage: Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number; costUSD: number }>
}

export interface InstalledPlugin {
  name: string
  marketplace: string
  transport: string
  command: string
}

export interface SkillUsage {
  name: string
  usage_count: number
  last_used_at: number | null
}

export interface GlobalSettings {
  num_startups: number | null
  install_method: string | null
  theme: string | null
  auto_updates: boolean | null
  first_start_time: string | null
  last_release_notes_seen: string | null
  show_spinner_tree: boolean | null
  model_config?: {
    base_url: string
    default_model: string
    opus_model: string
    sonnet_model: string
    haiku_model: string
  }
}

export interface ConfigData {
  global_mcp_servers: McpServer[]
  projects: ProjectConfig[]
  installed_plugins: InstalledPlugin[]
  skill_usage: SkillUsage[]
  global_settings: GlobalSettings
}

export interface LiveSession {
  pid: number | null
  session_id: string
  cwd: string
  started_at: number | null
  version: string
  kind: string
  entrypoint: string
  status: string
  waiting_for: string | null
  updated_at: number | null
  is_alive: boolean
}

export interface ModelStats {
  sessions: number
  tokens_in: number
  tokens_out: number
  cache_read: number
  cost: number
  tool_calls: number
}

export interface HistoryEntry {
  display: string
  project: string
  session_id: string
  timestamp: number | null
}

// Session detail (full conversation)
export interface ConversationMessage {
  role: 'user' | 'assistant'
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result'
  content?: string
  tool_name?: string
  tool_id?: string
  tool_input?: Record<string, unknown>
  tool_use_id?: string
  is_error?: boolean
  timestamp: string | null
  model?: string
  stop_reason?: string
  usage?: { input: number; output: number; cache_read: number; cache_creation: number }
}

export interface SessionDetail {
  session_id: string
  messages: ConversationMessage[]
  message_count: number
  meta: Record<string, unknown>
}
