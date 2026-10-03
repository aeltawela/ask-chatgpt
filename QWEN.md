# Plugin context

This extension bundles its own shared core. Use its packaged MCP tools and skills; do not require a separate global installation. Before every commit, inspect the complete staged diff and exclude all personal or sensitive information, including credentials, account identifiers, private host/network details, configuration, personal contact details, and private conversations.

For consultation use `/chatgpt-ask <question>` or call the bundled MCP `ask_chatgpt` tool directly. This command does not depend on Qwen's Skill lookup. Extension skills are registered with qualified names (`chatgpt-as-provider:ask-chatgpt`); never invoke the bare `ask-chatgpt` name through the Skill tool. Default to Luna; reserve Astra for explicitly highly difficult problems or an explicit user choice.
