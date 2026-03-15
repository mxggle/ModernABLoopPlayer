# AGENTS.md

This repository is a Vite + React 18 + TypeScript application for A-B looping, shadowing recording, transcripts, and AI-assisted language-learning workflows.

## Scope

- Applies to the entire repository unless a deeper `AGENTS.md` overrides it.
- Prefer small, focused changes that preserve existing UX patterns and state behavior.

## Workflow

- Inspect the relevant code paths before editing.
- Prefer `rg`/`rg --files` for search.
- Use `apply_patch` for manual file edits.
- Do not revert user changes you did not make.
- Keep changes local to the task; avoid drive-by refactors.

## Stack

- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS, Radix UI, Framer Motion
- State: Zustand
- Routing: React Router
- i18n: `src/i18n` with locale JSON files in `src/i18n/locales`

## Platform Architecture

This project builds for both Electron and web from a single codebase. A strict
4-layer architecture is enforced — see **[docs/platform-architecture.md](docs/platform-architecture.md)**
for the full rules.

Quick reference:

| Layer | Directory | Rule |
|---|---|---|
| 4 – Entry points | `pages/`, `electron/`, `components/layout/AppLayout.tsx` | Can import anything |
| 3 – Platform-specific UI | `components/electron/`, `components/web/` | Imports Layer 1–2 only |
| 2 – Shared UI & state | `components/ui/`, `components/controls/`, `stores/`, `hooks/` | Must NOT import Layer 3–4 |
| 1 – Core / pure | `utils/`, `services/`, `types/`, `i18n/` | No platform dependencies |

Critical rules:
- `isElectron()` is only allowed in `utils/platform.ts`, `stores/electronStorage.ts`, `components/layout/AppLayout.tsx`, and files inside `components/electron/` or `components/web/`.
- `window.electronAPI` is only allowed in `electron/preload.ts`, `stores/electronStorage.ts`, and `components/electron/`.
- Pages always use `<AppLayout>` — never `ElectronAppLayout` or `WebAppLayout` directly.
- Cross-platform imports between `components/electron/` and `components/web/` are forbidden.

## Project Conventions

- Preserve the current component structure under `src/components`, `src/pages`, `src/hooks`, `src/stores`, and `src/utils`.
- When changing user-facing copy, update translations in:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ja.json`
  - `src/i18n/locales/zh.json`
- Reuse existing UI primitives from `src/components/ui` before adding new ones.
- Follow the established Zustand store patterns instead of introducing new global state approaches.
- Keep browser-only behavior compatible with Vite client execution.
- Be careful with audio, media, and recording flows; regressions there are high-impact.

## Validation

- Run targeted checks after changes when possible.
- Common commands:
  - `npm run build`
  - `npm run lint`

## Response Expectations

- Summarize what changed, note any risks, and mention validation performed.
- If tests or build checks were not run, say so explicitly.



## Compact Instructions

When compressing, preserve in priority order:

1. Architecture decisions (NEVER summarize)
2. Modified files and their key changes
3. Current verification status (pass/fail)
4. Open TODOs and rollback notes
5. Tool outputs (can delete, keep pass/fail only)