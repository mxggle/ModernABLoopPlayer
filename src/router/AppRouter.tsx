import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage, PlayerPage } from "../pages";
import { AISettingsPage } from "../pages/AISettingsPage";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/ai-settings" element={<AISettingsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
};
