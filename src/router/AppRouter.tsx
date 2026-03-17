import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { memo } from "react";
import { HomePage, PlayerPage } from "../pages";
import { SettingsPage } from "../pages/SettingsPage";
import { LayoutSettingsProvider } from "../contexts/LayoutSettingsContext";
import { usePlayerStore } from "../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import { isElectron } from "../utils/platform";

const Router = isElectron() ? HashRouter : BrowserRouter;

// Static object — same reference on every render, so React's style diffing is a no-op
// when visibility doesn't change.
const HIDDEN_STYLE: React.CSSProperties = {
  position: "fixed",
  left: "-9999px",
  top: 0,
  width: "100%",
  pointerEvents: "none",
  visibility: "hidden",
};

// Memoized so it never re-renders due to AppRouterInner re-renders on route change.
// PlayerPage has no props — all data flows through store hooks — so memo is safe here.
// Without this, every route navigation causes PlayerPage + all transcript segments to re-render.
const PersistentPlayer = memo(() => <PlayerPage />);

const AppRouterInner = () => {
  const location = useLocation();
  const { currentFile, currentYouTube } = usePlayerStore(
    useShallow((state) => ({
      currentFile: state.currentFile,
      currentYouTube: state.currentYouTube,
    }))
  );

  const hasMedia = !!(currentFile || currentYouTube);
  const isOnPlayer = location.pathname === "/player";

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* When media is loaded, player is rendered persistently below; otherwise redirect home */}
        <Route
          path="/player"
          element={hasMedia ? null : <Navigate to="/" replace />}
        />
        <Route path="/ai-settings" element={<Navigate to="/settings" replace />} />
        <Route path="*" element={<HomePage />} />
      </Routes>

      {/* Keep PlayerPage mounted while media is loaded so audio element and state persist.
          PersistentPlayer (memo) skips re-render on route change — only the wrapper div's
          style prop is updated (a fast direct DOM write, not a React subtree reconciliation). */}
      {hasMedia && (
        <div style={isOnPlayer ? undefined : HIDDEN_STYLE}>
          <PersistentPlayer />
        </div>
      )}
    </>
  );
};

export const AppRouter = () => {
  return (
    <Router>
      <LayoutSettingsProvider>
        <AppRouterInner />
      </LayoutSettingsProvider>
    </Router>
  );
};
