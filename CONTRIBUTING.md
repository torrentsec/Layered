# Contributing

Thanks for helping. Layered is small on purpose, so the bar is: does it make tomorrow's outfit advice clearer or more right?

## Setup

```sh
git clone https://github.com/torrentsec/Layered && cd Layered
npm install
npm run dev
```

## Before you open a pull request

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

CI runs the same four on every pull request.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(engine): add commute legs`, `fix(today): handle offline cache`. Use the imperative mood and keep them short.
- **Branches** are named `feat/<issue>-<slug>` or `fix/<issue>-<slug>`.
- **Engine rules** live in `src/engine` as pure functions. A new rule needs a unit test at its threshold edges.
- **Comments** explain why, not what.
- **Source headers.** Every source file starts with:
  ```
  // SPDX-License-Identifier: AGPL-3.0-or-later
  // Copyright (c) 2026 Daniel Woo
  ```

How the team applies Scrum is in [`docs/process.md`](docs/process.md), and the backlog is in [`docs/requirements.md`](docs/requirements.md).

By contributing you agree that your work is licensed under AGPL-3.0-or-later.
