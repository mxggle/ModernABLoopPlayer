import { useState, useCallback, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Trash2,
  PanelLeftOpen,
  PanelLeftClose,
  Home,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import { AppLayoutBase } from "../layout/AppLayoutBase";
import { PlayHistory } from "./PlayHistory";
import { FolderBrowser } from "./FolderBrowser";

/* ── Section header (VS Code style) ─────────────────────────────── */
interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
}

const SectionHeader = ({ title, isOpen, onToggle, actions }: SectionHeaderProps) => (
  <div className="flex items-center h-[28px] bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/60 select-none group">
    <button
      onClick={onToggle}
      className="flex-1 flex items-center min-w-0 h-full px-2 gap-1 text-left focus:outline-none"
    >
      {isOpen ? (
        <ChevronDown className="w-3 h-3 shrink-0 text-gray-500 dark:text-gray-400" />
      ) : (
        <ChevronRight className="w-3 h-3 shrink-0 text-gray-500 dark:text-gray-400" />
      )}
      <span className="text-[11px] font-semibold tracking-wider text-gray-600 dark:text-gray-300 truncate uppercase">
        {title}
      </span>
    </button>
    {actions && (
      <div className="flex items-center mr-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {actions}
      </div>
    )}
  </div>
);

/* ── Tiny icon button for section header actions ────────────────── */
const HeaderAction = ({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    title={title}
    className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
  >
    {children}
  </button>
);

/* ── Layout settings ────────────────────────────────────────────── */
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

/* ── Main component ─────────────────────────────────────────────── */
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

  const {
    isSidebarOpen,
    sidebarWidth,
    setIsSidebarOpen,
    setSidebarWidth,
    theme,
    setTheme,
    sidebarSections,
    toggleSidebarSection,
    addSourceFolder,
    clearMediaHistory,
  } = usePlayerStore(
    useShallow((state) => ({
      isSidebarOpen: state.isSidebarOpen,
      sidebarWidth: state.sidebarWidth,
      setIsSidebarOpen: state.setIsSidebarOpen,
      setSidebarWidth: state.setSidebarWidth,
      theme: state.theme,
      setTheme: state.setTheme,
      sidebarSections: state.sidebarSections,
      toggleSidebarSection: state.toggleSidebarSection,
      addSourceFolder: state.addSourceFolder,
      clearMediaHistory: state.clearMediaHistory,
    }))
  );

  /* ── Resize logic ──────────────────────────────────────────────── */
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

  /* ── Handlers ──────────────────────────────────────────────────── */
  const navigateToHome = () => {
    const { setCurrentFile, setCurrentYouTube } = usePlayerStore.getState();
    setCurrentFile(null);
    setCurrentYouTube(null);
    navigate("/");
  };

  const handleAddFolder = useCallback(async () => {
    const selected = await window.electronAPI!.openFolder();
    if (!selected) return;
    addSourceFolder(selected);
  }, [addSourceFolder]);

  const handleClearHistory = useCallback(async () => {
    await clearMediaHistory();
  }, [clearMediaHistory]);

  /* ── Sidebar ───────────────────────────────────────────────────── */
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
          {/* Title bar spacer (macOS draggable region) */}
          <div
            className={`w-full shrink-0 h-[52px] sm:h-[56px] border-b border-gray-200 dark:border-gray-700 ${
              isMac ? "[-webkit-app-region:drag]" : ""
            }`}
          />

          {/* ─── EXPLORER section ─────────────────────────────────── */}
          <SectionHeader
            title={t("sidebar.explorer", "EXPLORER")}
            isOpen={sidebarSections.explorer}
            onToggle={() => toggleSidebarSection("explorer")}
            actions={
              <HeaderAction onClick={handleAddFolder} title={t("sidebar.addFolder", "Add folder")}>
                <FolderPlus className="w-3.5 h-3.5" />
              </HeaderAction>
            }
          />
          {sidebarSections.explorer && (
            <div className={`overflow-y-auto overflow-x-hidden custom-scrollbar ${
              sidebarSections.recent ? "flex-shrink-0 max-h-[50%]" : "flex-1 min-h-0"
            }`}>
              <FolderBrowser onAddFolder={handleAddFolder} />
            </div>
          )}

          {/* ─── RECENT section ──────────────────────────────────── */}
          <SectionHeader
            title={t("sidebar.recent", "RECENT")}
            isOpen={sidebarSections.recent}
            onToggle={() => toggleSidebarSection("recent")}
            actions={
              <HeaderAction
                onClick={handleClearHistory}
                title={t("sidebar.clearHistory", "Clear history")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </HeaderAction>
            }
          />
          {sidebarSections.recent && (
            <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 min-h-0">
              <PlayHistory />
            </div>
          )}

          {/* ─── Spacer: push footer to bottom when no section content is flex-filling ── */}
          {!sidebarSections.recent && !sidebarSections.explorer && <div className="flex-1" />}

          {/* ─── Bottom bar ──────────────────────────────────────── */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around bg-gray-50/50 dark:bg-gray-800/20 shrink-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title={
                theme === "dark"
                  ? t("layout.switchToLightTheme", "Light Theme")
                  : t("layout.switchToDarkTheme", "Dark Theme")
              }
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title={t("layout.openSettings", "Open Settings")}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* ─── Resize handle ───────────────────────────────────── */}
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500/30 transition-colors z-[70] ${
              isResizing ? "bg-purple-500/50 w-1.5" : ""
            }`}
          />
        </>
      )}

      <style>{`
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

  /* ── Header leading slot (Home + toggle) ───────────────────────── */
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
