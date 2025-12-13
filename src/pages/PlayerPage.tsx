import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../stores/playerStore";
import { MediaPlayer } from "../components/player/MediaPlayer";
import { YouTubePlayer } from "../components/player/YouTubePlayer";
import { CombinedControls } from "../components/controls/CombinedControls";
import { MobileControls } from "../components/controls/MobileControls";
import { BookmarkDrawer } from "../components/player/BookmarkDrawer";
import { MediaHistory } from "../components/player/MediaHistory";
import { WaveformVisualizer } from "../components/waveform/WaveformVisualizer";
import { TranscriptPanel } from "../components/transcript";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useWindowSize } from "../hooks/useWindowSize";
import { usePlaybackPersistence } from "../hooks/usePlaybackPersistence";
import { AppLayout } from "../components/layout/AppLayout";

export const PlayerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [layoutSettings, setLayoutSettings] = useState({
    showPlayer: true,
    showWaveform: true,
    showTranscript: true,
    showControls: true,
  });
  const { isMobile } = useWindowSize();

  const { currentFile, currentYouTube, showWaveform, isLoadingMedia } =
    usePlayerStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize playback persistence
  usePlaybackPersistence();

  // Redirect to home if no media is available and not loading
  useEffect(() => {
    if (!currentFile && !currentYouTube && !isLoadingMedia) {
      navigate("/");
    }
  }, [currentFile, currentYouTube, isLoadingMedia, navigate]);

  const youtubeId = currentYouTube?.id;

  // Auto-default player visibility based on media type
  // For audio files, hide the large player card by default (still render in hidden mode)
  // For video (YouTube or file), show the player by default
  useEffect(() => {
    if (currentFile) {
      const isAudio = currentFile.type.includes("audio");
      setLayoutSettings((prev) => ({ ...prev, showPlayer: !isAudio }));
    }
  }, [currentFile]);

  useEffect(() => {
    if (youtubeId && !currentFile) {
      setLayoutSettings((prev) => ({ ...prev, showPlayer: true }));
    }
  }, [youtubeId, currentFile]);

  return (
    <AppLayout
      layoutSettings={layoutSettings}
      setLayoutSettings={setLayoutSettings}
    >
      {/* Show loading message if media is being loaded */}
      {
        isLoadingMedia && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t("common.loading")}
              </p>
            </div>
          </div>
        )
      }

      {/* Show message if no media is available and not loading */}
      {
        !currentFile && !youtubeId && !isLoadingMedia && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                {t("player.noMediaLoaded")}
              </p>
            </div>
          </div>
        )
      }

      {/* Player Section - Always render media elements for functionality, but handle visibility appropriately */}
      {
        (youtubeId || currentFile) && (
          <>
            {/* When player is hidden, render only the functional media elements with no UI or space */}
            {!layoutSettings.showPlayer ? (
              youtubeId && !currentFile ? (
                <YouTubePlayer videoId={youtubeId} hiddenMode={true} />
              ) : (
                <MediaPlayer hiddenMode={true} />
              )
            ) : (
              /* When player is visible, render the full UI */
              <div className="relative rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5">
                {youtubeId && !currentFile && (
                  <YouTubePlayer videoId={youtubeId} />
                )}
                {currentFile && <MediaPlayer />}
              </div>
            )}
          </>
        )
      }

      {/* Waveform Section */}
      {
        (currentFile || youtubeId) &&
        (currentFile?.type.includes("audio") || currentFile?.type.includes("video") || youtubeId) &&
        showWaveform &&
        layoutSettings.showWaveform && (
          <div className="mt-4 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10 p-4">
            <WaveformVisualizer />
          </div>
        )
      }

      {/* Dynamic Content Area (Transcript + Controls) */}
      {
        (currentFile || youtubeId) && (
          <div className="flex flex-col flex-1 min-h-0">
            {" "}
            {/* Parent flex container for transcript and controls */}
            {/* Transcript panel - designed to grow */}
            {layoutSettings.showTranscript && (
              <div className="mt-2 sm:mt-3 flex-1 flex flex-col min-h-0">
                {" "}
                {/* Wrapper for TranscriptPanel, allows growth */}
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
        )
      }

      {/* Bookmarks Drawer - its positioning is typically outside normal flex flow (e.g., fixed or absolute) */}
      {(currentFile || youtubeId) && <BookmarkDrawer />}

      {/* Media History - also typically outside normal flex flow */}
      <MediaHistory />
    </AppLayout >
  );
};
