import { useState, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { SettingsDrawer } from "./SettingsDrawer";
import { Moon, Sun, Info, Settings, Layout, Eye, EyeOff } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";

interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

interface AppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
}

export const AppLayout = ({
  children,
  layoutSettings,
  setLayoutSettings,
}: AppLayoutProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);

  const { currentFile, currentYouTube, theme, setTheme, seekStepSeconds, seekSmallStepSeconds } = usePlayerStore();

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Navigate to home
  const navigateToHome = () => {
    // Clear media first to prevent PlayerPage from reloading
    const { setCurrentFile, setCurrentYouTube } = usePlayerStore.getState();
    setCurrentFile(null);
    setCurrentYouTube(null);
    // Then navigate
    navigate("/");
  };

  // Toggle Settings Drawer
  const toggleSettingsDrawer = () => {
    setIsSettingsDrawerOpen(!isSettingsDrawerOpen);
  };

  const youtubeId = currentYouTube?.id;

  return (
    <div className="flex flex-col min-h-screen w-full max-w-5xl mx-auto overflow-x-hidden pb-20 sm:pb-40 px-2 sm:px-4">
      {/* Spacer to prevent content from being hidden behind fixed header */}
      <div className="h-[52px] sm:h-[56px]"></div>
      {/* Header - fixed at the top */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 fixed top-0 left-0 right-0 z-[55] max-w-5xl mx-auto">
        <button
          onClick={navigateToHome}
          className="flex items-center gap-1 sm:gap-2 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1024 1024"
            className="h-8 sm:h-9 w-auto fill-current text-purple-600"
            aria-label="LoopMate Logo"
          >
            <g transform="translate(0,1024) scale(0.1,-0.1)">
              <path d="M3246 7708 c-4 -24 -18 -92 -31 -153 -13 -60 -26 -121 -29 -135 -2 -14 -11 -56 -19 -95 -9 -38 -18 -83 -20 -100 -8 -47 -158 -811 -172 -875 -3 -14 -8 -38 -11 -55 -2 -16 -37 -187 -75 -380 -39 -192 -73 -361 -75 -375 -3 -14 -7 -32 -9 -40 -2 -8 -7 -31 -10 -50 -3 -19 -121 -609 -262 -1310 -140 -701 -257 -1284 -259 -1295 -2 -11 -15 -76 -29 -144 -14 -68 -25 -132 -25 -142 0 -18 51 -19 1813 -19 1174 0 1851 4 1922 10 712 67 1267 502 1450 1135 41 141 55 246 55 400 0 307 -81 568 -244 788 -192 260 -427 420 -703 477 l-58 12 72 28 c320 123 565 431 649 815 9 39 18 129 21 200 12 283 -76 580 -237 807 -217 305 -566 485 -1020 527 -75 7 -563 11 -1401 11 l-1286 0 -7 -42z m989 -828 c14 -5 52 -31 84 -57 206 -169 338 -278 347 -288 12 -11 25 -22 739 -620 281 -235 517 -435 525 -444 60 -63 85 -162 56 -223 -20 -42 -111 -130 -246 -240 -120 -97 -135 -110 -294 -241 -186 -154 -268 -222 -1021 -840 -148 -122 -370 -305 -493 -407 -146 -122 -240 -193 -275 -207 -64 -27 -154 -30 -203 -7 -60 29 -124 143 -124 223 0 37 35 211 164 801 24 113 54 252 66 310 12 58 24 112 25 120 19 84 50 229 85 390 44 208 70 326 75 350 2 8 31 143 65 300 72 338 104 485 130 600 10 47 21 96 24 110 43 218 67 298 98 328 48 45 120 62 173 42z" />
              <path d="M4725 5688 c-263 -211 -602 -508 -615 -537 -9 -23 -8 -35 3 -62 8 -19 105 -132 216 -251 166 -180 208 -219 241 -229 44 -13 94 0 105 29 6 16 68 346 80 427 3 22 14 87 24 145 10 58 24 139 31 180 14 81 17 102 25 140 15 71 17 160 5 175 -21 25 -71 18 -115 -17z" />
            </g>
          </svg>
          <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
            LoopMate
          </h1>
        </button>

        <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
          {/* Layout Settings - Show when media is loaded and layout settings are available */}
          {(currentFile || youtubeId) &&
            layoutSettings &&
            setLayoutSettings && (
              <Popover.Root
                open={isLayoutPopoverOpen}
                onOpenChange={setIsLayoutPopoverOpen}
              >
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

                      {/* Player Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {layoutSettings.showPlayer ? (
                            <Eye className="h-4 w-4 text-gray-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("layout.player")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setLayoutSettings({
                              ...layoutSettings,
                              showPlayer: !layoutSettings.showPlayer,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            layoutSettings.showPlayer
                              ? "bg-purple-600"
                              : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              layoutSettings.showPlayer
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Waveform Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {layoutSettings.showWaveform ? (
                            <Eye className="h-4 w-4 text-gray-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("layout.waveform")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setLayoutSettings({
                              ...layoutSettings,
                              showWaveform: !layoutSettings.showWaveform,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            layoutSettings.showWaveform
                              ? "bg-purple-600"
                              : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              layoutSettings.showWaveform
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Transcript Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {layoutSettings.showTranscript ? (
                            <Eye className="h-4 w-4 text-gray-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("layout.transcript")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setLayoutSettings({
                              ...layoutSettings,
                              showTranscript: !layoutSettings.showTranscript,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            layoutSettings.showTranscript
                              ? "bg-purple-600"
                              : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              layoutSettings.showTranscript
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Controls Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {layoutSettings.showControls ? (
                            <Eye className="h-4 w-4 text-gray-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("layout.controls")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setLayoutSettings({
                              ...layoutSettings,
                              showControls: !layoutSettings.showControls,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            layoutSettings.showControls
                              ? "bg-purple-600"
                              : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              layoutSettings.showControls
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <Popover.Arrow className="fill-white dark:fill-gray-800" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}

          {/* Theme Toggle */}
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

          {/* Settings Button */}
          <button
            onClick={toggleSettingsDrawer}
            className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label={t("layout.openSettings")}
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Info/Keyboard Shortcuts Dialog Trigger */}
          <Dialog.Root
            open={showKeyboardShortcuts}
            onOpenChange={setShowKeyboardShortcuts}
          >
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
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      Spacebar
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.playPause")}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      A
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.setAPoint")}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      B
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.setBPoint")}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      L
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.toggleLoop")}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      C
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.clearLoopPoints")}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      ←/→
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.seekBackwardForward", { seconds: seekStepSeconds })}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      Shift + ←/→
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.seekBackwardForwardSmall", { seconds: seekSmallStepSeconds })}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      ↑/↓
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.volumeUpDown")}
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      0-9
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("layout.jumpToPercent")}
                    </div>
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

      {/* Settings Drawer - Always render but only show Interface Layout when media is loaded */}
      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={toggleSettingsDrawer}
        layoutSettings={layoutSettings}
        setLayoutSettings={setLayoutSettings}
      />

      {/* Main Content */}
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
};
