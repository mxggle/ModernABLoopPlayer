import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage, PlayerPage } from "../pages";
import { SettingsPage } from "../pages/SettingsPage";
import { LayoutSettingsProvider } from "../contexts/LayoutSettingsContext";
import { isElectron } from "../utils/platform";

const Router = isElectron() ? HashRouter : BrowserRouter;

export const AppRouter = () => {
  return (
    <Router>
      <LayoutSettingsProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/player" element={<PlayerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ai-settings" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </LayoutSettingsProvider>
    </Router>
  );
};
