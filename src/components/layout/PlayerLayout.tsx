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
    <div className="flex flex-col min-h-screen max-w-6xl mx-auto p-3 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-3 py-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          ModernABLoop
        </h1>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <Dialog.Root
            open={showKeyboardShortcuts}
            onOpenChange={setShowKeyboardShortcuts}
          >
            <Dialog.Trigger asChild>
              <button
                className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
                aria-label="Show keyboard shortcuts"
              >
                <Info size={20} />
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

      {/* Main Content */}
      <main className="space-y-3 flex-grow overflow-hidden flex flex-col">
        {/* Media Input Section - Collapsible */}
        {(currentFile || youtubeId) && (
          <div className="mb-4">
            <button
              onClick={toggleInputSections}
              className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium">
                {showInputSections
                  ? "Hide Media Sources"
                  : "Show Media Sources"}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentFile
                  ? currentFile.name
                  : youtubeId
                  ? `YouTube: ${youtubeId}`
                  : ""}
              </span>
            </button>
          </div>
        )}

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
          <div className="card overflow-hidden flex-grow">
            {youtubeId && !currentFile && <YouTubePlayer videoId={youtubeId} />}

            {currentFile && <MediaPlayer />}

            {currentFile && currentFile.type.includes("audio") && (
              <div className="flex items-center justify-end p-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={toggleWaveform}
                  className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
                >
                  {showWaveform ? "Hide Waveform" : "Show Waveform"}
                </button>
              </div>
            )}

            {currentFile &&
              currentFile.type.includes("audio") &&
              showWaveform && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                  <WaveformVisualizer />
                </div>
              )}
          </div>
        )}

        {/* Controls Section */}
        {(currentFile || youtubeId) && (
          <>
            {/* Add padding at the bottom to account for the fixed controls */}
            <div className="pb-16"></div>

            {/* Combined Controls (fixed at bottom) */}
            <CombinedControls />

            {/* Bookmarks Drawer */}
            <BookmarkDrawer />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>ModernABLoop - A tool for creating loops in audio and video files</p>
      </footer>
    </div>
  );
};
