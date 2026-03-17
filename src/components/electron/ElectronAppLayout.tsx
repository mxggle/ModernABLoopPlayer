import { useState, useCallback, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import {
  History as HistoryIcon,
  FolderSearch, PanelLeftOpen, PanelLeftClose, Home,
  Moon, Sun, Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayoutBase } from "../layout/AppLayoutBase";
import { PlayHistory } from "./PlayHistory";
import { FolderBrowser } from "./FolderBrowser";

interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

interface ElectronAppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
}

export const ElectronAppLayout = ({
  children,
  layoutSettings,
  setLayoutSettings,
}: ElectronAppLayoutProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac OS X");

  const { isSidebarOpen, sidebarWidth, setIsSidebarOpen, setSidebarWidth, theme, setTheme, activeSidebarTab, setActiveSidebarTab } = usePlayerStore(
    useShallow((state) => ({
      isSidebarOpen: state.isSidebarOpen,
      sidebarWidth: state.sidebarWidth,
      setIsSidebarOpen: state.setIsSidebarOpen,
      setSidebarWidth: state.setSidebarWidth,
      theme: state.theme,
      setTheme: state.setTheme,
      activeSidebarTab: state.activeSidebarTab,
      setActiveSidebarTab: state.setActiveSidebarTab,
    }))
  );

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 450) setSidebarWidth(newWidth);
      }
    },
    [isResizing, setSidebarWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const navigateToHome = () => {
    const { setCurrentFile, setCurrentYouTube } = usePlayerStore.getState();
    setCurrentFile(null);
    setCurrentYouTube(null);
    navigate("/");
  };

  const sidebar = (
    <aside
      ref={sidebarRef}
      style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
      className={`fixed left-0 top-0 bottom-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col z-[60] shrink-0 ${
        !isSidebarOpen ? "border-none overflow-hidden" : ""
      } transition-[width] duration-300 ease-in-out`}
    >
      {isSidebarOpen && (
        <>
          {/* Top layout spacer. Aligns with AppLayoutBase header border & acts as draggable mac title bar */}
          <div className={`w-full shrink-0 h-[52px] sm:h-[56px] border-b border-gray-200 dark:border-gray-700 ${isMac ? "[-webkit-app-region:drag]" : ""}`} />

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveSidebarTab("recent")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  activeSidebarTab === "recent"
                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                {t("home.recent", "Recent")}
              </button>
              <button
                onClick={() => setActiveSidebarTab("folders")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  activeSidebarTab === "folders"
                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <FolderSearch className="w-3.5 h-3.5" />
                {t("home.folders", "Folders")}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-w-0">
            <AnimatePresence mode="wait">
              {activeSidebarTab === "recent" ? (
                <motion.div
                  key="recent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 min-w-0"
                >
                  <div className="sidebar-container-override no-scroll-internal min-w-0">
                    <PlayHistory />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="folders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0"
                >
                  <div className="sidebar-container-override no-scroll-internal min-w-0">
                    <FolderBrowser />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around bg-gray-50/50 dark:bg-gray-800/20">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title={theme === "dark" ? t("layout.switchToLightTheme", "Light Theme") : t("layout.switchToDarkTheme", "Dark Theme")}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title={t("layout.openSettings", "Open Settings")}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500/30 transition-colors z-[70] ${
              isResizing ? "bg-purple-500/50 w-1.5" : ""
            }`}
          />
        </>
      )}

      <style>{`
        .sidebar-container-override > div {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .sidebar-container-override h3 { display: none !important; }
        .no-scroll-internal ul,
        .no-scroll-internal .max-h-72,
        .no-scroll-internal .max-h-80 {
          max-height: none !important;
          overflow-y: visible !important;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156,163,175,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156,163,175,0.4);
        }
      `}</style>
    </aside>
  );

  const headerLeadingSlot = (
    <div className="flex items-center gap-0.5 mr-2 shrink-0">
      <button
        onClick={navigateToHome}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-purple-600 transition-colors"
        title={t("common.home", "Home")}
      >
        <Home className="w-4 h-4" />
      </button>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
        title={
          isSidebarOpen
            ? t("layout.hideSidebar", "Hide Sidebar")
            : t("layout.showSidebar", "Show Sidebar")
        }
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  return (
    <AppLayoutBase
      layoutSettings={layoutSettings}
      setLayoutSettings={setLayoutSettings}
      headerLeadingSlot={headerLeadingSlot}
      sidebar={sidebar}
      contentPaddingLeft={isSidebarOpen ? sidebarWidth : 0}
      headerOffsetLeft={isSidebarOpen ? sidebarWidth : 0}
      desktopMode={true}
      hideThemeToggle={true}
      hideSettings={true}
    >
      {children}
    </AppLayoutBase>
  );
};
