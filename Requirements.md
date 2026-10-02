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
11. The project is distributed as an encapsulated plugin/extension package for each supported harness, installed and removed using that harness's normal package or extension manager. Consultation must not require a separate global npm installation.
12. Sign-in normally uses the official browser link and login flow, including PKCE/state/nonce checks and validated identity. A clearly labeled manual access-token entry path is available for exceptional/headless setups; it must never accept tokens as command-line arguments, log them, or send them to the calling model.
13. Root agent instructions require reviewing staged changes before every commit and excluding personal or sensitive information, including credentials, identity/account details, private host/network values, private configuration, and private conversation content. Automated secret scanning remains enabled in CI.
14. Installation guides provide the standard install, sign-in, diagnostics, provider setup, update, and uninstall commands for every supported harness, while preserving unrelated user settings and requiring explicit provider selection.
