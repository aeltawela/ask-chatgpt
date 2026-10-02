# OpenCode

Add a user skill from `skills/ask-chatgpt` and configure MCP in `opencode.json`:

```json
{"mcp":{"chatgpt":{"type":"local","command":["chatgpt-as-provider","mcp"],"enabled":true}}}
```

For provider mode, start `chatgpt-as-provider serve --protocol openai` with `CHATGPT_PROVIDER_GATEWAY_TOKEN` in the environment. Define a custom OpenAI compatible provider at `http://127.0.0.1:8765/v1`, set the same token as its bearer credential, and select a discovered model. Back up the config first. Restore it and remove the local process to uninstall.
