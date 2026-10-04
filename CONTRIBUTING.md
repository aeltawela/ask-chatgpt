# Contributing to ask-chatgpt

Thanks for helping make ChatGPT useful in more coding harnesses. Small, focused improvements are welcome.

## Start with an issue

Please [open a bug report](https://github.com/aeltawela/ask-chatgpt/issues/new?template=bug_report.yml) or [feature request](https://github.com/aeltawela/ask-chatgpt/issues/new?template=feature_request.yml) before a large change. Include the harness, version, operating system, install path, expected behavior and a redacted reproduction. Search existing issues first so related reports can be linked.

For security issues, do not open a public issue with a credential, identity claim, private prompt, transcript or gateway token. Follow [the security guide](docs/security-and-privacy.md) and contact the maintainer privately until a security contact is published.

## Local setup

Requirements: Node.js 22 or newer.

    git clone https://github.com/aeltawela/ask-chatgpt.git
    cd ask-chatgpt
    npm ci
    npm test
    npm run check

Tests use mocked OAuth and Responses events. They must never use a real account, spend plan usage or write a personal transcript.

## Pull requests

1. Create a focused branch such as `fix/qwen-login`, `feat/attachment-validation` or `docs/quickstart`.
2. Make the smallest complete change that solves the issue.
3. Add or update meaningful tests for behavior changes. New harnesses must use the shared core and add wrapper conformance scenarios.
4. Update the relevant integration guide, compatibility matrix, changelog and Requirements.md when behavior or support changes.
5. Run `npm test`, `npm run check`, `npm pack --dry-run` and the repository secret scan locally.
6. Open a PR using the template. Explain the user-visible change, validation performed, compatibility impact and any live checks that remain unverified.
7. Keep the PR reviewable. Respond to review comments with a new commit or a clear follow-up; do not force-push over active review without explaining why.

Please do not silently change a client active provider, add telemetry, write transcript files for temporary requests or broaden OAuth scopes.

## What maintainers look for

- Privacy-safe behavior: no tokens, account identifiers, private hostnames, personal contact details or unredacted prompts in source, fixtures, logs, screenshots or commits.
- Correct status handling: upstream completion is success; cancellation, incomplete responses, limits, tool exchanges and broken streams remain distinct.
- Shared-core reuse: wrappers normalize their client protocol and do not reimplement authentication or session storage.
- Honest support claims: update `docs/compatibility.md` and label live harness checks separately from mocked protocol tests.
- Reversible setup: preserve unrelated client settings and provide uninstall/restore guidance.

## Commit and review checklist

Use a clear imperative subject, for example `Add Gemini attachment validation`. Before requesting review, confirm:

- [ ] `npm test` passes.
- [ ] `npm run check` passes.
- [ ] Package contents contain no secrets or personal data.
- [ ] README and integration docs explain install, login, update and uninstall.
- [ ] Requirements.md and CHANGELOG.md reflect the change.
- [ ] The PR description includes tests, screenshots or recordings where useful, and known limitations.

By contributing, you agree that your changes are provided under the repository GPL-3.0-or-later license.
