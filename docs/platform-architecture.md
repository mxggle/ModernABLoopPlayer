# Platform Architecture: Electron + Web

This document defines the layered architecture for features that must support
both the Electron desktop build and the web (Vite SPA) build.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4 – Platform Entry Points                            │
│  electron/main.ts, electron/preload.ts                      │
│  src/pages/ElectronHomePage.tsx                             │
│  src/pages/WebHomePage.tsx                                  │
│  src/components/layout/AppLayout.tsx  ← single isElectron() │
│  Can import: any layer                                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 3 – Platform-Specific Components                     │
│  src/components/electron/   (Electron-only UI)              │
│  src/components/web/        (Web-only UI)                   │
│  May import: Layer 1 and Layer 2 only                       │
│  Must NOT import from the sibling platform directory        │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 – Shared UI & State                                │
│  src/components/layout/AppLayoutBase.tsx                    │
│  src/components/ui/        (Radix primitives)               │
│  src/components/controls/  (playback controls)              │
│  src/components/transcript/, waveform/, bookmarks/          │
│  src/stores/, src/hooks/                                    │
│  Must NOT import from Layer 3 or Layer 4                    │
│  Must NOT call isElectron() or window.electronAPI           │
├─────────────────────────────────────────────────────────────┤
│  Layer 1 – Core (Pure, No Platform Dependencies)            │
│  src/utils/           (except platform.ts — see below)      │
│  src/services/                                              │
│  src/types/                                                 │
│  src/i18n/                                                  │
│  src/utils/platform.ts        ← isElectron() defined here  │
│  src/stores/electronStorage.ts ← only IPC adapter allowed  │
│  Must NOT call window.electronAPI directly (except above)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Layout

```
src/
├── components/
│   ├── electron/          # Electron-only components (Layer 3)
│   │   ├── ElectronAppLayout.tsx
│   │   ├── ElectronFileOpener.tsx
│   │   ├── FolderBrowser.tsx
│   │   └── PlayHistory.tsx
│   ├── web/               # Web-only components (Layer 3)
│   │   ├── WebAppLayout.tsx
│   │   ├── FileUploader.tsx
│   │   └── MediaHistory.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx      # Platform selector — one isElectron() call
│   │   └── AppLayoutBase.tsx  # Shared chrome (Layer 2)
│   ├── ui/                # Shared Radix primitives (Layer 2)
│   ├── controls/          # Shared playback controls (Layer 2)
│   ├── transcript/        # Shared (Layer 2)
│   ├── waveform/          # Shared (Layer 2)
│   └── bookmarks/         # Shared (Layer 2)
├── pages/
│   ├── HomePage.tsx           # Delegates to Web/ElectronHomePage
│   ├── WebHomePage.tsx        # Web-specific home
│   ├── ElectronHomePage.tsx   # Electron-specific home
│   └── PlayerPage.tsx         # Shared (uses AppLayout facade)
├── stores/
│   ├── playerStore.ts         # Shared Zustand store (Layer 2)
│   └── electronStorage.ts     # IPC bridge adapter (Layer 1, only allowed IPC caller)
├── utils/
│   ├── platform.ts            # isElectron(), getPlatform(), nativePathToUrl()
│   └── ...                    # Other pure utilities (Layer 1)
└── types/
    └── electron.d.ts          # ElectronAPI interface contract
```

---

## Rules

### R1 – `isElectron()` call sites (STRICT)

`isElectron()` may only appear in these files:

| File | Reason |
|---|---|
| `src/utils/platform.ts` | Definition |
| `src/stores/electronStorage.ts` | Storage bridge |
| `src/components/layout/AppLayout.tsx` | Single layout selector |
| Files inside `src/components/electron/` | Platform-specific components |
| Files inside `src/components/web/` | Platform-specific components |

**Forbidden in:** `src/components/ui/`, `src/components/controls/`,
`src/hooks/`, `src/services/`, `src/utils/` (except platform.ts),
`src/stores/` (except electronStorage.ts).

### R2 – `window.electronAPI` call sites (STRICT)

Direct calls to `window.electronAPI` are only allowed in:
- `electron/preload.ts` (definition)
- `src/stores/electronStorage.ts` (config persistence bridge)
- `src/components/electron/` (Electron-specific components)

Never call `window.electronAPI` from shared layers (Layer 1 or Layer 2).

### R3 – Import direction

Layers may only import **downward**:

```
Layer 4 → can import 1, 2, 3
Layer 3 → can import 1, 2 only
Layer 2 → can import 1 only
Layer 1 → no project imports
```

Cross-platform imports between `components/electron/` and `components/web/`
are **forbidden**.

### R4 – Where does new code go?

Use this decision tree for any new component or utility:

```
Does it call window.electronAPI or require a native OS feature?
  YES → src/components/electron/
Does it use web-only APIs (IndexedDB, FileReader, drag-and-drop File API)?
  YES → src/components/web/
Is it pure logic (no DOM, no platform APIs)?
  YES → src/utils/ or src/services/
Is it a UI component shared by both platforms?
  YES → src/components/<domain>/ (controls, transcript, waveform, etc.)
```

### R5 – Adding a platform-split feature

When a feature has different UX per platform but shared state:

1. Put shared state in `src/stores/playerStore.ts` (or a new Zustand slice)
2. Put shared logic in `src/utils/` or `src/services/`
3. Create `src/components/electron/MyFeature.tsx` for the Electron UI
4. Create `src/components/web/MyFeature.tsx` for the web UI
5. If the feature needs a layout-level slot, add it to `AppLayoutBase` props,
   then provide it from `ElectronAppLayout` or `WebAppLayout`

### R6 – AppLayout usage

Pages always import `AppLayout` from `src/components/layout/AppLayout.tsx`.
They never import `ElectronAppLayout` or `WebAppLayout` directly.
This keeps pages platform-agnostic.

### R7 – Naming

Files in `src/components/electron/` should be named for what they do, not
that they're "Electron" (e.g. `FolderBrowser`, not `ElectronFolderBrowser`),
**unless** there is a same-named web counterpart — in which case use the
`Electron` prefix to disambiguate (e.g. `ElectronFileOpener` vs `FileUploader`).

---

## IPC Contract

All Electron IPC calls go through the interface defined in `src/types/electron.d.ts`.
When adding new IPC channels:
1. Add the method signature to `ElectronAPI` in `electron.d.ts`
2. Implement the handler in `electron/main.ts`
3. Expose it via `contextBridge` in `electron/preload.ts`
4. Call it only from `src/components/electron/` or `src/stores/electronStorage.ts`

---

## Anti-Patterns to Avoid

```typescript
// ❌ WRONG: isElectron() in a shared hook
// src/hooks/useMediaLoader.ts
if (isElectron()) { ... }

// ✅ CORRECT: separate implementations in each platform layer
// src/components/electron/ElectronMediaLoader.tsx  — calls window.electronAPI
// src/components/web/WebMediaLoader.tsx            — uses IndexedDB / FileReader

// ❌ WRONG: Electron component in player/ (shared directory)
// src/components/player/FolderBrowser.tsx

// ✅ CORRECT: platform-specific directory
// src/components/electron/FolderBrowser.tsx

// ❌ WRONG: web component importing from electron
// src/components/web/Foo.tsx
import { FolderBrowser } from "../electron/FolderBrowser";

// ✅ CORRECT: only AppLayout.tsx bridges the platforms via the selector pattern
```
