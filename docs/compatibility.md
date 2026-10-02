# Compatibility matrix

Statuses: **Implemented** means a wrapper or protocol translator exists in this repository. **Mock tested** means automated local tests exercise translation without client sign-in or paid inference. **Live unverified** means this environment did not have the client or an authenticated test account available. Do not interpret implementation or mock tests as end-to-end support.

| Client | Consultation wrapper | Provider protocol | Local status | Live client status |
|---|---|---|---|---|
| Qwen Code | stdio MCP + `ask-chatgpt` skill | OpenAI Chat Completions gateway | Implemented; mock tested | Live unverified |
| OpenCode | stdio MCP + skill | OpenAI Chat Completions gateway | Implemented; mock tested | Live unverified |
| Pi | stdio MCP + skill | OpenAI Chat Completions gateway | Implemented; mock tested | Live unverified |
| Gemini CLI | stdio MCP + skill | Gemini `generateContent` gateway | Implemented; mock tested | Live unverified |
| Claude Code | stdio MCP + skill | Anthropic Messages gateway | Implemented; mock tested | Live unverified; unsupported by Anthropic for non-Claude models |

## Protocol notes

The OpenAI Chat Completions, Anthropic Messages and Gemini formats are translated by `src/protocols.mjs`. The Responses request remains the source of truth. Text deltas are forwarded as they arrive; structured tool arguments are emitted after the completed upstream response because the shared result validates the terminal event first. Gemini Files API URIs and Gemini structured-output settings are not translated. The three gateway stream contracts are unit tested; no harness CLI sign-in/inference smoke test is claimed until a client and authenticated account are available.
