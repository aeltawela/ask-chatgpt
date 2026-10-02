# Requirements

1. One shared Node.js core serves a consultation skill (`ask-chatgpt`) and a provider skill (`chatgpt-as-provider`).
2. The core uses the documented Sign in with ChatGPT open-source OAuth flow; it never calls private ChatGPT backend endpoints.
3. Temporary conversation content remains in process memory and every Responses request sets `store: false` and `stream: true`. Persistent local sessions require explicit opt-in.
4. OAuth tokens are stored only in an owner-only, locally encrypted credential file; tokens and prompts are never logged or placed in client settings.
5. The core discovers the signed-in account's models, reports the selected model and reasoning effort, refreshes tokens safely, and distinguishes completed, failed, incomplete, interrupted and uncertain requests.
6. Automatic reasoning uses the calling model's explicit effort when available and otherwise a lightweight ChatGPT classification request. Explicit user choice wins.
7. Consultation tools return ChatGPT tool calls for the host to approve and execute. The core never runs requested shell or MCP tools itself.
8. Five client wrappers target Qwen Code, OpenCode, Pi, Gemini CLI and Claude Code. The compatibility matrix labels local, mocked and live verification separately.
9. Only features supported by the selected model and documented OAuth flow are advertised. Unsupported features produce clear errors.
10. Documentation explains provider compatibility limits and that plugin-level non-persistence cannot control upstream or host retention.
