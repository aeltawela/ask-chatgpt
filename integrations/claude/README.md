# Claude Code

Install the plugin containing the `ask-chatgpt` skill and add the stdio MCP server with `claude mcp add chatgpt -- chatgpt-as-provider mcp`. Sign in using the CLI.

For provider mode, start `chatgpt-as-provider serve --protocol anthropic`, set `ANTHROPIC_BASE_URL=http://127.0.0.1:8765` and set `ANTHROPIC_AUTH_TOKEN` to the local `CHATGPT_PROVIDER_GATEWAY_TOKEN` in the private launch environment. Choose a discovered model through Claude Code's model settings. Save and restore the prior environment/configuration to uninstall.

Anthropic says it does not support routing Claude Code to non-Claude models through a gateway. Treat this as community compatibility, expect breakage with client updates, and do not use it in managed environments that enforce `allowedProviders`.
