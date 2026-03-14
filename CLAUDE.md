# CLAUDE.md

This repository is a Vite + React 18 + TypeScript application for A-B looping, shadowing recording, transcripts, and AI-assisted language-learning workflows.

## Scope

- Applies to the entire repository unless a deeper `CLAUDE.md` overrides it.
- Prefer small, focused changes that preserve existing UX patterns and state behavior.

## Workflow

- Read the relevant files before editing.
- Prefer `rg`/`rg --files` for search.
- Make minimal, targeted edits.
- Do not revert user changes you did not make.
- Avoid unrelated refactors unless they are required to complete the task safely.

## Stack

- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS, Radix UI, Framer Motion
- State: Zustand
- Routing: React Router
- i18n: `src/i18n` with locale JSON files in `src/i18n/locales`

## Project Conventions

- Preserve the current component structure under `src/components`, `src/pages`, `src/hooks`, `src/stores`, and `src/utils`.
- When changing user-facing copy, update translations in:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ja.json`
  - `src/i18n/locales/zh.json`
- Reuse existing UI primitives from `src/components/ui` before creating new ones.
- Follow the established Zustand store patterns instead of introducing new global state approaches.
- Keep browser-only behavior compatible with Vite client execution.
- Treat audio, media, transcript, and recording flows as sensitive areas that need careful regression avoidance.

## Validation

- Run targeted validation after changes when possible.
- Common commands:
  - `npm run build`
  - `npm run lint`

## Response Expectations

- Summarize what changed, note any risks, and mention validation performed.
- If checks were not run, say so explicitly.
