# Claude Code

Add the repository as a marketplace and install the bundled plugin with Claude Code's plugin manager:

```sh
claude plugin marketplace add aeltawela/chatgpt-as-provider
claude plugin install chatgpt-as-provider@chatgpt-as-provider
```

The plugin installs its two skills and local MCP server together; do not add a separate global CLI or MCP entry. Use its `chatgpt_login` tool once to open the official browser login. Update with `claude plugin update chatgpt-as-provider@chatgpt-as-provider`; uninstall with `claude plugin uninstall chatgpt-as-provider@chatgpt-as-provider`.

If the browser callback is unavailable, use the hidden-input fallback from the installed plugin directory: `node <plugin-directory>/src/cli.mjs login --manual-token`. Never put a token in chat, shell history, command arguments, settings, or a tool call.

For provider mode, start `node <plugin-directory>/src/cli.mjs serve --protocol anthropic`, set `ANTHROPIC_BASE_URL=http://127.0.0.1:8765` and set `ANTHROPIC_AUTH_TOKEN` to the local `CHATGPT_PROVIDER_GATEWAY_TOKEN` in the private launch environment. Choose a discovered model through Claude Code's model settings. Save and restore the prior environment/configuration to uninstall.

Anthropic says it does not support routing Claude Code to non-Claude models through a gateway. Treat this as community compatibility, expect breakage with client updates, and do not use it in managed environments that enforce `allowedProviders`.
