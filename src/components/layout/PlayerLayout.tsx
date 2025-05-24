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

  const { currentFile, theme, setTheme, showWaveform, setShowWaveform } =
    usePlayerStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Toggle waveform visibility
  const toggleWaveform = () => {
    setShowWaveform(!showWaveform);
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

  return (
    <div className="flex flex-col h-screen max-h-screen max-w-5xl mx-auto p-4 overflow-hidden">
      {/* Header - improved layout */}
      <header className="flex items-center justify-between mb-4 py-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          ModernABLoop
        </h1>

        <div className="flex items-center space-x-3">
          {/* Media Sources Button in Header */}
          {(currentFile || youtubeId) && (
            <button
              onClick={toggleInputSections}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md text-gray-700 dark:text-gray-200 shadow-sm transition-colors text-sm font-medium"
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
      <main className="space-y-4 flex-grow overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
        {/* Media Input Section - Collapsible (now controlled from header) */}

        {/* Media Input Section */}
        {(showInputSections || (!currentFile && !youtubeId)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-3">
                Load YouTube Video
              </h2>
              <YouTubeInput onVideoIdSubmit={setYoutubeId} />
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-3">
                Load Audio/Video File
              </h2>
              <FileUploader />
            </div>
          </div>
        )}

        {/* Player Section */}
        {(youtubeId || currentFile) && (
          <div
            className={`card overflow-hidden flex-grow bg-white dark:bg-gray-800 shadow-md rounded-lg ${
              !showWaveform ? "flex flex-col" : ""
            }`}
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
