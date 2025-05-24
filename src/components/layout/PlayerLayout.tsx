import { useState, useEffect } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { MediaPlayer } from "../player/MediaPlayer";
import { YouTubePlayer } from "../player/YouTubePlayer";
import { FileUploader } from "../player/FileUploader";
import { YouTubeInput } from "../player/YouTubeInput";
import { CombinedControls } from "../controls/CombinedControls";
import { BookmarkDrawer } from "../player/BookmarkDrawer";
import { WaveformVisualizer } from "../waveform/WaveformVisualizer";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Moon, Sun, Info } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
// No framer-motion animations for simpler implementation

export const PlayerLayout = () => {
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showInputSections, setShowInputSections] = useState(true);

  const {
    currentFile,
    currentYouTube,
    theme,
    setTheme,
    showWaveform,
    setCurrentYouTube,
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

  return (
    <div className="flex flex-col h-screen max-h-screen w-full max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-4 overflow-hidden">
      {/* Header - improved layout */}
      <header className="flex items-center justify-between mb-2 sm:mb-4 py-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
          ModernABLoop
        </h1>

        <div className="flex items-center space-x-3">
          {/* Media Sources Button in Header */}
          {(currentFile || youtubeId) && (
            <button
              onClick={toggleInputSections}
              className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200 shadow-sm transition-colors font-medium"
            >
              <span>{showInputSections ? "Hide Sources" : "Show Sources"}</span>
              <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400 ml-1">
                {currentFile
                  ? currentFile.name.substring(0, 15) +
                    (currentFile.name.length > 15 ? "..." : "")
                  : youtubeId
                  ? `YT: ${youtubeId.substring(0, 8)}...`
                  : ""}
              </span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Dialog.Root
            open={showKeyboardShortcuts}
            onOpenChange={setShowKeyboardShortcuts}
          >
            <Dialog.Trigger asChild>
              <button
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
                aria-label="Show keyboard shortcuts"
              >
                <Info size={16} />
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

      {/* Main Content - better spacing */}
      <main className="space-y-2 sm:space-y-4 flex-grow overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
        {/* Media Input Section - Collapsible (now controlled from header) */}

        {/* Media Input Section - Redesigned with modern visuals */}
        {(showInputSections || (!currentFile && !youtubeId)) && (
          <div className="relative bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 p-5 sm:p-8 rounded-2xl shadow-sm mb-4 sm:mb-6 border border-purple-100/50 dark:border-purple-800/20 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-200/30 to-indigo-200/30 dark:from-purple-700/10 dark:to-indigo-700/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tl from-purple-200/30 to-indigo-200/30 dark:from-purple-700/10 dark:to-indigo-700/10 rounded-full blur-xl"></div>
            
            {/* Content container with z-index to appear above decorative elements */}
            <div className="relative z-10">
              {/* Section title */}
              <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-700 to-indigo-700 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Choose Your Media Source
              </h2>
              
              {/* Tabs-style grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                {/* YouTube Card */}
                <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm p-5 sm:p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 space-y-4 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <span className="text-purple-500 dark:text-purple-400">YouTube</span> Video
                    </h3>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                    </div>
                  </div>
                  <YouTubeInput onVideoIdSubmit={handleVideoIdSubmit} />
                </div>
                
                {/* File Upload Card */}
                <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm p-5 sm:p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 flex flex-col transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <span className="text-indigo-500 dark:text-indigo-400">Local</span> Media
                    </h3>
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                      <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {(youtubeId || currentFile) && (
          <div
            className={`relative flex-grow flex flex-col overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700`}
          >
            {youtubeId && !currentFile && <YouTubePlayer videoId={youtubeId} />}

            {currentFile && <MediaPlayer />}

            {/* Enhanced waveform toggle - more prominent */}
            {/* {currentFile && currentFile.type.includes("audio") && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Audio Visualization
                </span>
                <button
                  onClick={toggleWaveform}
                  className="px-4 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium shadow-sm"
                >
                  {showWaveform ? "Hide Waveform" : "Show Waveform"}
                </button>
              </div>
            )} */}

            {currentFile &&
              currentFile.type.includes("audio") &&
              showWaveform && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10">
                  <WaveformVisualizer />
                </div>
              )}
          </div>
        )}

        {/* Controls Section */}
        {(currentFile || youtubeId) && (
          <>
            {/* Minimal padding for controls */}
            <div className="pb-2"></div>

            {/* Combined Controls (fixed at bottom) */}
            <CombinedControls />

            {/* Bookmarks Drawer */}
            <BookmarkDrawer />
          </>
        )}
      </main>

      {/* Footer - subtle improvement */}
      <footer className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          ModernABLoop - A tool for creating precise loops in audio and video
          files
        </p>
      </footer>
    </div>
  );
};
