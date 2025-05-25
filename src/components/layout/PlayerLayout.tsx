import { useState, useEffect } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { MediaPlayer } from "../player/MediaPlayer";
import { YouTubePlayer } from "../player/YouTubePlayer";
import { FileUploader } from "../player/FileUploader";
import { YouTubeInput } from "../player/YouTubeInput";
import { CombinedControls } from "../controls/CombinedControls";
import { MobileControls } from "../controls/MobileControls";
import { BookmarkDrawer } from "../player/BookmarkDrawer";
import { MediaHistory } from "../player/MediaHistory";
import { InitialHistoryDisplay } from "../player/InitialHistoryDisplay";
import { WaveformVisualizer } from "../waveform/WaveformVisualizer";
import { TranscriptPanel, TranscriptToggle } from "../transcript";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useWindowSize } from "../../hooks/useWindowSize";
import { SettingsDrawer } from "./SettingsDrawer";
import { Moon, Sun, Info, Settings } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export const PlayerLayout = () => {
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showInputSections, setShowInputSections] = useState(true);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState({
    showPlayer: true,
    showWaveform: true,
    showTranscript: true,
    showControls: true,
  });
  const { isMobile } = useWindowSize();

  const {
    currentFile,
    currentYouTube,
    theme,
    setTheme,
    showWaveform,
    setCurrentYouTube,
    bookmarks,
  } = usePlayerStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Toggle input sections visibility
  const toggleInputSections = () => {
    setShowInputSections(!showInputSections);
  };

  // Hide input sections when media is loaded
  useEffect(() => {
    if (currentFile || youtubeId) {
      setShowInputSections(false);
    }
  }, [currentFile, youtubeId]);

  // Sync the local youtubeId with the store's currentYouTube
  useEffect(() => {
    if (currentYouTube) {
      setYoutubeId(currentYouTube.id);
    } else {
      setYoutubeId(null);
    }
  }, [currentYouTube]);

  // Handle YouTube video ID submission
  const handleVideoIdSubmit = (videoId: string) => {
    setCurrentYouTube({ id: videoId });
  };

  // Toggle Settings Drawer
  const toggleSettingsDrawer = () => {
    setIsSettingsDrawerOpen(!isSettingsDrawerOpen);
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-5xl mx-auto overflow-x-hidden pb-40">
      {/* Header - fixed at the top */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button
          onClick={toggleInputSections}
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
          {/* Transcript Toggle - Retained as it's separate from 'Show Sources' */}
          {(currentFile || youtubeId) && layoutSettings.showTranscript && (
            <TranscriptToggle />
          )}

          {/* Bookmark Drawer Trigger */}
          {bookmarks.length > 0 && <BookmarkDrawer />}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label={
              theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
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
            aria-label="Open settings"
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
                aria-label="Show keyboard shortcuts"
              >
                <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
              <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-700">
                <Dialog.Title className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </Dialog.Title>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      Spacebar
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Play/Pause
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      A
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Set A point at current time
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      B
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Set B point at current time
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      L
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Toggle loop on/off
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      C
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Clear loop points
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      ←/→
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Seek backward/forward 5 seconds
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      Shift + ←/→
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Seek backward/forward 1 second
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      ↑/↓
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Volume up/down
                    </div>

                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      0-9
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Jump to 0-90% of track
                    </div>
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full font-medium shadow-sm transition-colors">
                    Close
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={toggleSettingsDrawer}
        layoutSettings={layoutSettings}
        setLayoutSettings={setLayoutSettings}
      />

      {/* Input Sections: File Uploader and YouTube Input */}
      {showInputSections && (
        <div className="relative bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 p-3 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm mb-3 sm:mb-6 border border-purple-100/50 dark:border-purple-800/20 overflow-hidden flex-shrink-0">
          {/* Background decorative elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-200/30 to-indigo-200/30 dark:from-purple-700/10 dark:to-indigo-700/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tl from-purple-200/30 to-indigo-200/30 dark:from-purple-700/10 dark:to-indigo-700/10 rounded-full blur-xl"></div>

          {/* Content container with z-index to appear above decorative elements */}
          <div className="relative z-10">
            {/* Section title */}
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-700 to-indigo-700 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Choose Your Media Source
            </h2>

            {/* Check for history and display if available */}
            <InitialHistoryDisplay />

            {/* Tabs-style grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8">
              {/* YouTube Card */}
              <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm p-3 sm:p-6 rounded-lg sm:rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 space-y-3 sm:space-y-4 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-purple-500 dark:text-purple-400">
                      YouTube
                    </span>{" "}
                    Video
                  </h3>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <svg
                      className="w-5 h-5 text-purple-600 dark:text-purple-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                  </div>
                </div>
                <YouTubeInput onVideoIdSubmit={handleVideoIdSubmit} />
              </div>

              {/* File Upload Card */}
              <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm p-3 sm:p-6 rounded-lg sm:rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 flex flex-col transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-indigo-500 dark:text-indigo-400">
                      Local
                    </span>{" "}
                    Media
                  </h3>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                    <svg
                      className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow">
                  <FileUploader />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Section */}
      {(youtubeId || currentFile) && layoutSettings.showPlayer && (
        <div className="relative rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5">
          {youtubeId && !currentFile && <YouTubePlayer videoId={youtubeId} />}
          {currentFile && <MediaPlayer />}
        </div>
      )}

      {/* Waveform Section */}
      {currentFile &&
        currentFile.type.includes("audio") &&
        showWaveform &&
        layoutSettings.showWaveform && (
          <div className="mt-4 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10 p-4">
            <WaveformVisualizer />
          </div>
        )}

      {/* Dynamic Content Area (Transcript + Controls) */}
      {(currentFile || youtubeId) && (
        <div className="flex flex-col flex-1 min-h-0"> {/* Parent flex container for transcript and controls */}
          {/* Transcript panel - designed to grow */}
          {layoutSettings.showTranscript && (
            <div className="mt-2 sm:mt-3 flex-1 flex flex-col min-h-0"> {/* Wrapper for TranscriptPanel, allows growth */}
              <TranscriptPanel />
            </div>
          )}

          {/* Media controls (should not grow) */}
          {layoutSettings.showControls && (
            <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-900 rounded-lg p-3 sm:p-4 ">
              {isMobile ? <MobileControls /> : <CombinedControls />}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks Drawer - its positioning is typically outside normal flex flow (e.g., fixed or absolute) */}
      {(currentFile || youtubeId) && <BookmarkDrawer />}

      {/* Media History - also typically outside normal flex flow */}
      <MediaHistory />
    </div>
  );
};
