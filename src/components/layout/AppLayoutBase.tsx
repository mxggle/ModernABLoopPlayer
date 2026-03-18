import { useState, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import {
  Moon, Sun, Info, Settings, Layout, Eye, EyeOff,
  Music, Video, Youtube,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";

interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

export interface AppLayoutBaseProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
  /** Left slot in the header: logo button (web) or sidebar toggle (Electron) */
  headerLeadingSlot?: React.ReactNode;
  /** Sidebar element rendered as a fixed aside (Electron only) */
  sidebar?: React.ReactNode;
  /** Dynamic left padding for main content when sidebar is open */
  contentPaddingLeft?: number;
  /** Dynamic left offset for the fixed header when sidebar is open */
  headerOffsetLeft?: number;
  /** Extra className on the outermost wrapper, e.g. "max-w-5xl mx-auto overflow-x-hidden" for web */
  containerClassName?: string;
  /** Enables desktop-specific styling like draggable header */
  desktopMode?: boolean;
  /** Hides the theme toggle from the header (useful when moved to sidebar) */
  hideThemeToggle?: boolean;
  /** Hides the settings button from the header (useful when moved to sidebar) */
  hideSettings?: boolean;
}

export const AppLayoutBase = ({
  children,
  layoutSettings,
  setLayoutSettings,
  headerLeadingSlot,
  sidebar,
  contentPaddingLeft = 0,
  headerOffsetLeft = 0,
  containerClassName = "",
  desktopMode = false,
  hideThemeToggle = false,
  hideSettings = false,
}: AppLayoutBaseProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac OS X");

  const {
    currentFile,
    currentYouTube,
    theme,
    setTheme,
    seekStepSeconds,
    seekSmallStepSeconds,
  } = usePlayerStore(
    useShallow((state) => ({
      currentFile: state.currentFile,
      currentYouTube: state.currentYouTube,
      theme: state.theme,
      setTheme: state.setTheme,
      seekStepSeconds: state.seekStepSeconds,
      seekSmallStepSeconds: state.seekSmallStepSeconds,
    }))
  );

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const youtubeId = currentYouTube?.id;

  return (
    <div className={`flex min-h-screen w-full bg-white dark:bg-gray-900 ${containerClassName} pb-20 sm:pb-40 px-2 sm:px-4`}>
      {sidebar}

      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ paddingLeft: contentPaddingLeft }}
      >
        {/* Spacer for fixed header */}
        <div className="h-[52px] sm:h-[56px]"></div>

        <header
          className={`flex items-center h-[52px] sm:h-[56px] justify-between px-2 sm:px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 fixed top-0 right-0 z-[55] ${
            desktopMode ? "[-webkit-app-region:drag] select-none [&_button]:[-webkit-app-region:no-drag] [&_input]:[-webkit-app-region:no-drag] [&_a]:[-webkit-app-region:no-drag] [&_[role='dialog']]:[-webkit-app-region:no-drag]" : ""
          }`}
          style={{ 
            left: headerOffsetLeft,
            paddingLeft: desktopMode && isMac && headerOffsetLeft === 0 ? "80px" : undefined
          }}
        >
          {headerLeadingSlot}

          {/* Media title – centered */}
          {(currentFile || currentYouTube) && (
            <div className="flex-1 flex justify-center px-2 sm:px-4 overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 max-w-full transition-all hover:bg-white dark:hover:bg-gray-800">
                {currentYouTube ? (
                  <Youtube className="h-3 w-3 text-red-500 shrink-0" />
                ) : currentFile?.type.includes("video") ? (
                  <Video className="h-3 w-3 text-blue-500 shrink-0" />
                ) : (
                  <Music className="h-3 w-3 text-purple-500 shrink-0" />
                )}
                <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[100px] sm:max-w-[350px]">
                  {currentYouTube
                    ? currentYouTube.title || currentYouTube.id
                    : currentFile?.name}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
            {/* Layout settings popover */}
            {(currentFile || youtubeId) && layoutSettings && setLayoutSettings && (
              <Popover.Root open={isLayoutPopoverOpen} onOpenChange={setIsLayoutPopoverOpen}>
                <Popover.Trigger asChild>
                  <button
                    className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                    aria-label={t("layout.layoutSettings")}
                  >
                    <Layout className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-64 z-50"
                    sideOffset={8}
                    align="end"
                  >
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                        {t("layout.layoutSettings")}
                      </h3>

                      {(
                        [
                          ["showWaveform", "layout.waveform"],
                          ["showTranscript", "layout.transcript"],
                          ["showControls", "layout.controls"],
                        ] as const
                      ).map(([key, labelKey]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {layoutSettings[key] ? (
                              <Eye className="h-4 w-4 text-gray-500" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t(labelKey)}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setLayoutSettings({ ...layoutSettings, [key]: !layoutSettings[key] })
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              layoutSettings[key]
                                ? "bg-purple-600"
                                : "bg-gray-200 dark:bg-gray-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                layoutSettings[key] ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Popover.Arrow className="fill-white dark:fill-gray-800" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}

            {/* Theme toggle */}
            {!hideThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label={
                  theme === "dark"
                    ? t("layout.switchToLightTheme")
                    : t("layout.switchToDarkTheme")
                }
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            )}

            {/* Settings */}
            {!hideSettings && (
              <button
                onClick={() => navigate("/settings")}
                className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label={t("layout.openSettings")}
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}

            {/* Keyboard shortcuts dialog */}
            <Dialog.Root open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
              <Dialog.Trigger asChild>
                <button
                  className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label={t("layout.showKeyboardShortcuts")}
                >
                  <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-700">
                  <Dialog.Title className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    {t("layout.keyboardShortcuts")}
                  </Dialog.Title>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="font-medium text-gray-800 dark:text-gray-200">Spacebar</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.playPause")}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">A</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.setAPoint")}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">B</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.setBPoint")}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">L</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.toggleLoop")}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">C</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.clearLoopPoints")}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">←/→</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {t("layout.seekBackwardForward", { seconds: seekStepSeconds })}
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Shift + ←/→</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {t("layout.seekBackwardForwardSmall", { seconds: seekSmallStepSeconds })}
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">↑/↓</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.volumeUpDown")}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">0-9</div>
                      <div className="text-gray-600 dark:text-gray-400">{t("layout.jumpToPercent")}</div>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full font-medium shadow-sm transition-colors">
                      {t("common.close")}
                    </button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </header>

        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
};
