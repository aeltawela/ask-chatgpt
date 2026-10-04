# OpenCode

Install the package with OpenCode's plugin manager. This installs the OpenCode consultation and provider skills, native tools, and shared core together. The adapter supports OpenCode v2 and the v1 plugin API:

```sh
opencode plugin add github:aeltawela/ask-chatgpt
```

Use `chatgpt_login` once to open the official browser login. Check installation with `opencode plugin list`; update with `opencode plugin update ask-chatgpt`; remove with `opencode plugin remove ask-chatgpt`.

If the browser callback is unavailable, use the hidden-input fallback from the installed plugin directory: `node <plugin-directory>/src/cli.mjs login --manual-token`. Never place a token in chat, shell history, command arguments, settings, or a tool call.

For provider mode, start `node <plugin-directory>/src/cli.mjs serve --protocol openai` with `ASK_CHATGPT_GATEWAY_TOKEN` in a private launch environment. Define a custom OpenAI-compatible provider at `http://127.0.0.1:8765/v1`, set the same token as its bearer credential, and select a discovered model. Back up the config first. Restore it and remove the local process to uninstall.
