# Implementation Plan: Route Navigation State Stability Fix

## Task Type
- [x] Frontend

## Problem Summary

When a user is playing media on `/player`, navigates to `/settings`, and returns, several state issues occur:
1. AI explanation responses get lost
2. Media files may disappear (especially during storage cleanup races)
3. Playback state resets unexpectedly
4. Layout settings reset on re-mount

## Root Cause Analysis

### Bug 1: PlayerPage unmounts entirely on route change — component tree destroyed

**Root cause**: React Router renders `<PlayerPage />` and `<SettingsPage />` as sibling routes. When navigating `/player` → `/settings`, PlayerPage unmounts completely, destroying:
- `MediaPlayer` component (and its `<audio>`/`<video>` elements)
- All local component state
- `useEffect` cleanup fires: `MediaPlayer.tsx:115-122` sets `isPlaying: false`

When navigating back to `/player`, PlayerPage re-mounts from scratch. The `useEffect` at `PlayerPage.tsx:53-58` fires again and resets `showPlayer` based on `currentFile` (even though it hasn't changed), potentially overriding user's layout preferences.

**File**: `src/router/AppRouter.tsx:10-15` — Routes are not wrapped with any persistence mechanism.

### Bug 2: AI Explanation responses — dual Map inconsistency

**Root cause**: `TranscriptSegment.tsx:33-34` and `ExplanationDrawer.tsx:39-40` each declare their own separate `globalExplanationStates` Map and `globalExplanationListeners` Set at module scope. These are **two independent instances**, NOT shared.

- `TranscriptSegment` writes to its own Map with `result: string` (mock)
- `ExplanationDrawer` writes to its own Map with `result: ExplanationResult` (real)
- The listener Sets are also separate, so state changes in one module don't propagate to the other

While module-scope Maps survive navigation (they persist for the JS process lifetime), the **component re-mount** means React local state re-initializes from whichever Map the component reads. If `ExplanationDrawer` had real results but `TranscriptSegment` reads from its own empty Map, the icons reset to "idle".

**Files**:
- `src/components/transcript/TranscriptSegment.tsx:33-46`
- `src/components/transcript/ExplanationDrawer.tsx:39-58`

### Bug 3: Media files disappearing — storage cleanup race condition

**Root cause**: `cleanupOldFiles()` in `mediaStorage.ts:135-201` deletes IndexedDB entries by oldest timestamp **without checking if the file is currently in use**. When a new file is stored (`storeMediaFile` at line 223-224), if total storage > 90% capacity, cleanup runs and may delete the currently-playing file's IndexedDB entry.

Additionally, `removeFromHistory` at `playerStore.ts:974-1057` deletes IndexedDB files AND clears `currentFile` to null if the deleted item matches the current media. This could be triggered from the `MediaHistory` component which is rendered on BOTH `PlayerPage` and `HomePage`.

**Files**:
- `src/utils/mediaStorage.ts:135-201` (cleanupOldFiles)
- `src/stores/playerStore.ts:974-1057` (removeFromHistory)

### Bug 4: LayoutSettings reset on navigation

**Root cause**: `LayoutSettingsContext.tsx` uses React `useState` — the state persists as long as `LayoutSettingsProvider` stays mounted (it wraps all routes, so it does persist). However, `PlayerPage.tsx:53-58` has a `useEffect` that resets `showPlayer` every time the component mounts, because `currentFile` is in the dependency array and is still set when returning from Settings:

```tsx
useEffect(() => {
  if (currentFile) {
    const isAudio = currentFile.type.includes("audio");
    setLayoutSettings((prev) => ({ ...prev, showPlayer: !isAudio }));
  }
}, [currentFile]); // Fires on mount because currentFile exists
```

This useEffect **does not check if layout was already configured** — it unconditionally overwrites `showPlayer` on every mount.

**File**: `src/pages/PlayerPage.tsx:53-58`

### Bug 5: navigateToHome clears media — back button race

**Root cause**: `AppLayout.tsx:58-65` `navigateToHome()` calls `setCurrentFile(null)` and `setCurrentYouTube(null)` before `navigate("/")`. If the user uses browser back button instead, this doesn't fire. But if they click the logo on Settings page, it clears media even though they might expect to return to the player.

**File**: `src/components/layout/AppLayout.tsx:58-65`

## Technical Solution

### Strategy: Preserve PlayerPage state across navigation using route-level persistence

The core fix is to prevent PlayerPage from fully unmounting during settings navigation, combined with fixing the duplicate state Maps and storage cleanup safety.

## Implementation Steps

### Step 1: Prevent PlayerPage unmount during settings navigation
**Approach**: Use a layout route or `<Outlet>` pattern so PlayerPage stays mounted while Settings is shown as an overlay/separate view. Alternatively, use CSS-based route hiding (display:none) to keep the component tree alive.

**Pseudo-code**:
```tsx
// AppRouter.tsx — Option A: Conditional rendering with display:none
<BrowserRouter>
  <LayoutSettingsProvider>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player" element={<PlayerPage />} />
      <Route path="/player/settings" element={<PlayerPage showSettings />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </LayoutSettingsProvider>
</BrowserRouter>

// Option B (simpler): Keep PlayerPage mounted via a wrapper
// Create a PersistentPlayerLayout that renders PlayerPage with display:none
// when on /settings, and shows SettingsPage content
```

**Recommended approach (simplest)**: Add a `keepAlive` wrapper that renders PlayerPage always when `currentFile || currentYouTube` is set, hiding it via CSS when the route is `/settings`.

```tsx
// AppRouter.tsx
const AppRouterInner = () => {
  const location = useLocation();
  const { currentFile, currentYouTube } = usePlayerStore(useShallow(...));
  const hasMedia = !!(currentFile || currentYouTube);
  const isOnSettings = location.pathname === '/settings';

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={hasMedia ? <Navigate to="/player" /> : <HomePage />} />
      </Routes>
      {/* Keep PlayerPage mounted when media is loaded */}
      {hasMedia && (
        <div style={{ display: isOnSettings || location.pathname === '/' ? 'none' : undefined }}>
          <PlayerPage />
        </div>
      )}
    </>
  );
};
```

- **Expected deliverable**: PlayerPage stays mounted during `/settings` visit, preserving audio element, playback state, and component tree.

### Step 2: Fix duplicate globalExplanationStates Maps
**Approach**: Extract shared explanation state to a single module.

```tsx
// NEW FILE: src/components/transcript/explanationState.ts
export interface ExplanationState {
  text: string;
  status: "idle" | "loading" | "completed" | "error";
  result?: ExplanationResult;
  error?: string;
}

export const globalExplanationStates = new Map<string, ExplanationState>();
export const globalExplanationListeners = new Set<() => void>();
export const explanationCache = new Map<string, ExplanationResult>();

export const setGlobalExplanationState = (text: string, state: Partial<ExplanationState>) => {
  const existing = globalExplanationStates.get(text) || { text, status: "idle" };
  globalExplanationStates.set(text, { ...existing, ...state });
  globalExplanationListeners.forEach((listener) => listener());
};

export const getGlobalExplanationState = (text: string): ExplanationState => {
  return globalExplanationStates.get(text) || { text, status: "idle" };
};
```

Then update both `TranscriptSegment.tsx` and `ExplanationDrawer.tsx` to import from this shared module instead of declaring their own copies.

- **Expected deliverable**: Single source of truth for AI explanation state; no more divergent Maps.

### Step 3: Fix PlayerPage layout reset on re-mount
**Approach**: Guard the `showPlayer` useEffect to only run on initial media load, not on re-mount.

```tsx
// PlayerPage.tsx — Add a ref to track if layout was already initialized for this media
const layoutInitializedRef = useRef<string | null>(null);

useEffect(() => {
  if (currentFile) {
    const mediaKey = currentFile.storageId || currentFile.id || currentFile.name;
    if (layoutInitializedRef.current !== mediaKey) {
      layoutInitializedRef.current = mediaKey;
      const isAudio = currentFile.type.includes("audio");
      setLayoutSettings((prev) => ({ ...prev, showPlayer: !isAudio }));
    }
  }
}, [currentFile]);
```

- **Expected deliverable**: Layout settings only reset when media actually changes, not on re-mount with same media.

### Step 4: Protect currently-playing files from storage cleanup
**Approach**: Pass the current media's storageId to `cleanupOldFiles` so it's excluded.

```tsx
// mediaStorage.ts
export const cleanupOldFiles = async (
  maxTotalStorage = DEFAULT_MAX_TOTAL_STORAGE,
  excludeIds: string[] = []  // <-- new parameter
): Promise<void> => {
  // ...existing code...
  for (const file of files) {
    if (currentSize <= maxTotalStorage * 0.8) break;
    if (excludeIds.includes(file.id)) continue; // <-- skip current media
    filesToDelete.push(file.id);
    currentSize -= file.fileSize;
  }
  // ...
};

// storeMediaFile — pass current storageId
export const storeMediaFile = async (
  file: File,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxTotalStorage = DEFAULT_MAX_TOTAL_STORAGE,
  excludeFromCleanup: string[] = []  // <-- new parameter
): Promise<string> => {
  // ...
  if (metadata.totalSize + file.size > maxTotalStorage * 0.9) {
    await cleanupOldFiles(maxTotalStorage, excludeFromCleanup);
  }
  // ...
};
```

And in `playerStore.ts` `setCurrentFile`, pass the current storageId:

```tsx
const currentStorageId = get().currentFile?.storageId;
const excludeIds = currentStorageId ? [currentStorageId] : [];
storageId = await storeMediaFile(file, undefined, undefined, excludeIds);
```

- **Expected deliverable**: Currently-playing media never gets garbage-collected by storage cleanup.

### Step 5: Fix MediaPlayer unmount cleanup
**Approach**: If we implement Step 1 (keep-alive), this is largely solved. But as a safety net, don't reset `isPlaying` to false on unmount if the unmount is due to navigation (not media removal).

```tsx
// MediaPlayer.tsx — only reset if media is actually being removed
useEffect(() => {
  return () => {
    // Only pause if the component unmounts AND the media element will be destroyed
    // The store will handle its own state if media changes
    const { currentFile: fileAtUnmount } = usePlayerStore.getState();
    if (!fileAtUnmount) {
      usePlayerStore.getState().setIsPlaying(false);
    }
  };
}, []);
```

- **Expected deliverable**: Playback state preserved during navigation if keep-alive is active.

### Step 6: Add Settings back navigation awareness
**Approach**: Settings "back" button should navigate to `/player` when media is loaded, not use `navigate(-1)` which can be unpredictable.

```tsx
// SettingsPage.tsx
const { currentFile, currentYouTube } = usePlayerStore(useShallow(...));
const hasMedia = !!(currentFile || currentYouTube);

// Back button:
onClick={() => navigate(hasMedia ? "/player" : "/")}
```

- **Expected deliverable**: Predictable back navigation from settings.

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/router/AppRouter.tsx` | Modify | Implement keep-alive pattern for PlayerPage |
| `src/components/transcript/explanationState.ts` | Create | Shared explanation state module |
| `src/components/transcript/TranscriptSegment.tsx:33-50` | Modify | Import from shared explanation state |
| `src/components/transcript/ExplanationDrawer.tsx:39-58` | Modify | Import from shared explanation state |
| `src/pages/PlayerPage.tsx:53-58` | Modify | Guard layout reset with ref |
| `src/utils/mediaStorage.ts:135-201` | Modify | Add excludeIds to cleanupOldFiles |
| `src/stores/playerStore.ts:293-305` | Modify | Pass current storageId to exclude from cleanup |
| `src/components/player/MediaPlayer.tsx:114-122` | Modify | Conditional cleanup on unmount |
| `src/pages/SettingsPage.tsx:304` | Modify | Smart back navigation |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Keep-alive PlayerPage may cause memory leaks if audio/video elements accumulate | Only render PlayerPage when media is loaded; clean up on explicit media clear |
| CSS `display:none` may not pause video playback in all browsers | MediaPlayer already handles pause on store state change; verify with Safari |
| Shared explanation state module may have circular import issues | New file has no imports from component files, only type definitions |
| Storage cleanup excludeIds might prevent necessary cleanup | Only excludes currently-playing file (1 file max); doesn't affect overall cleanup |
| `navigate(-1)` replacement may break deep-linked settings access | Only changes the back button behavior, not direct URL access |

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (no external model available)
- GEMINI_SESSION: N/A (no external model available)
