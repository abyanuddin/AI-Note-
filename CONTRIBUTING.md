# Contributing to MeetMind

Thanks for your interest in contributing to **MeetMind — AI Meeting Intelligence**!
This document describes how we branch, review and commit changes.

## Branch strategy

We use a two-tier branching model:

- **`main`** — always production-ready. Only reviewed, release-quality code lands here.
- **`develop`** — the integration branch. Day-to-day work is merged here first and
  validated before a release is promoted to `main`.
- **`feature/<name>`** — all new work happens on a feature branch created off
  `develop`, named descriptively, e.g. `feature/live-recording`,
  `feature/pdf-export`, `feature/mobile-auth`.

```
main        ← production releases
  ▲
develop     ← integration branch
  ▲
feature/*   ← individual features / fixes
```

## Pull request workflow

1. Create your branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/my-change
   ```
2. Make your changes, committing in logical steps.
3. Push your branch and **open a pull request against `develop`**.
4. Ensure the app builds and lints cleanly, and describe what your change does.
5. After review and approval, your PR is merged into `develop`.
6. For releases, `develop` is merged into `main` via a release pull request.

> Please do not open PRs directly against `main` except for hotfixes or releases.

## Commit message style

- Use the **imperative mood, present tense** — write the message as an instruction:
  - ✅ `Add live meeting audio capture`
  - ✅ `Fix session race condition on login`
  - ❌ `Added ...` / `Fixes ...` / `Adding ...`
- Keep the subject line concise (≈ 50 characters) and capitalised.
- Add a blank line and a body when more context is helpful (what and why).

## Code style

- Follow the existing TypeScript / Next.js conventions in the codebase.
- Run `npm run lint` before pushing.
- Keep changes focused; unrelated refactors belong in separate PRs.

Happy building! 🚀
