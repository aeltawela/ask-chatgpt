# Changelog

## 0.1.3

- Keep Claude Code MCP configuration in its plugin manifest so Qwen does not load Claude-only path variables or start an unrelated MCP OAuth flow.

## 0.1.2

- Package the shared core through each harness's normal extension/plugin manager.
- Add in-plugin browser sign-in and terminal-only manual access-token entry.
- Add explicit agent instructions to keep personal and sensitive information out of commits.
- Run CI dependency installation before tests and checks.

## 0.1.1

- Fix automatic reasoning classification request shape and release its OAuth sign-in timeout after callback.

## 0.1.0

- Initial shared OAuth core, CLI, stdio MCP consultation interface and opt-in encrypted local sessions.
- OpenAI Chat Completions, Anthropic Messages and Gemini generateContent provider gateway adapters.
- Qwen Code, OpenCode, Pi, Gemini CLI and Claude Code integration guidance and skills.
