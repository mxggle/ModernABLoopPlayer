import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import { MediaPlayer } from "../components/player/MediaPlayer";
import { YouTubePlayer } from "../components/player/YouTubePlayer";
import { CombinedControls } from "../components/controls/CombinedControls";
import { MobileControls } from "../components/controls/MobileControls";
import { isElectron } from "../utils/platform";
import { MediaHistory } from "../components/web/MediaHistory";
import { WaveformVisualizer } from "../components/waveform/WaveformVisualizer";
import { TranscriptPanel } from "../components/transcript";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useWindowSize } from "../hooks/useWindowSize";
import { usePlaybackPersistence } from "../hooks/usePlaybackPersistence";
import { AppLayout } from "../components/layout/AppLayout";
import { useLayoutSettings } from "../contexts/LayoutSettingsContext";

export const PlayerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const { isMobile } = useWindowSize();
  const layoutInitializedForRef = useRef<string | null>(null);

  const { currentFile, currentYouTube, showWaveform, isLoadingMedia } =
    usePlayerStore(
      useShallow((state) => ({
        currentFile: state.currentFile,
        currentYouTube: state.currentYouTube,
        showWaveform: state.showWaveform,
        isLoadingMedia: state.isLoadingMedia,
      }))
    );

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

  // Auto-default player visibility based on media type — only when media changes, not on re-mount
  useEffect(() => {
    if (currentFile) {
      const mediaKey = currentFile.storageId || currentFile.id || currentFile.name;
      if (layoutInitializedForRef.current !== mediaKey) {
        layoutInitializedForRef.current = mediaKey;
        const isAudio = currentFile.type.includes("audio");
        setLayoutSettings((prev) => ({ ...prev, showPlayer: !isAudio }));
      }
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
      bottomPaddingClassName="pb-28 sm:pb-28"
    >
      <div className="flex flex-1 min-h-0 flex-col">
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
                <div className="relative shrink-0 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5">
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
            <div className="shrink-0 sm:mt-4 sm:rounded-xl sm:border sm:border-gray-200 sm:dark:border-gray-700 sm:bg-gradient-to-r sm:from-purple-50/50 sm:to-indigo-50/50 sm:dark:from-purple-900/10 sm:dark:to-indigo-900/10 sm:p-4">
              <WaveformVisualizer />
            </div>
          )
        }

        {/* Dynamic Content Area (Transcript + Controls) */}
        {
          (currentFile || youtubeId) && (
            <div
              className={`flex flex-col min-h-0 ${layoutSettings.showTranscript ? "flex-1" : "shrink-0"
                }`}
            >
              {/* Transcript panel - designed to grow */}
              {layoutSettings.showTranscript && (
                <div className="mt-2 sm:mt-3 flex flex-1 min-h-0 flex-col">
                  <TranscriptPanel />
                </div>
              )}
              {/* Media controls (should not grow) */}
              {layoutSettings.showControls && (
                <div className="shrink-0 bg-white dark:bg-gray-900 rounded-lg">
                  {isMobile ? <MobileControls /> : <CombinedControls showSidebarOffset={isElectron()} />}
                </div>
              )}
            </div>
          )
        }

        {/* Media History – web only; Electron uses the sidebar PlayHistory */}
        {!isElectron() && <MediaHistory />}
      </div>
    </AppLayout>
  );
};
