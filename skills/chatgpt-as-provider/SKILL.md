---
name: chatgpt-as-provider
description: Configure an agent harness to use a signed-in ChatGPT account as its model provider. Use when the user explicitly wants ChatGPT to power the agent's main model loop.
---

# ChatGPT as Provider

Check the harness-specific reference under `integrations/` and the compatibility matrix before changing configuration. Sign in with the bundled `chatgpt_login` tool, which uses the official browser OAuth flow. Start the loopback gateway only after the user explicitly asks to use ChatGPT as the active provider. Use a fresh private gateway token and pass it only in the local process environment. Provider setup is reversible: save the exact prior setting, change only the selected provider fields, and give the user a direct restore command. Never install the provider silently or claim unsupported ChatGPT app features. Claude Code routing to a non-Claude model is outside Anthropic support. Provider clients may retain their own conversation history even though upstream Responses calls set `store:false`.

Default to Luna by leaving `model` unset. Choose the minimum useful `caller_effort` (low, medium, high) and `task_difficulty` (routine, difficult, highly_difficult). Reserve highly_difficult, which selects Astra, for exceptional research, complex proofs or deeply coupled analysis. High reasoning effort alone keeps Luna. An explicit user model wins; unavailable Luna/Astra must produce a clear error instead of substituting a model.
