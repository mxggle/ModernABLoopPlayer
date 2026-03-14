import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage, PlayerPage } from "../pages";
import { SettingsPage } from "../pages/SettingsPage";
import { LayoutSettingsProvider } from "../contexts/LayoutSettingsContext";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <LayoutSettingsProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/player" element={<PlayerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ai-settings" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </LayoutSettingsProvider>
    </BrowserRouter>
  );
};
