import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { FileUploader } from "../components/player/FileUploader";
import { YouTubeInput } from "../components/player/YouTubeInput";
import { InitialHistoryDisplay } from "../components/player/InitialHistoryDisplay";
import { MediaHistory } from "../components/player/MediaHistory";
import { AppLayout } from "../components/layout/AppLayout";

export const HomePage = () => {
  const navigate = useNavigate();
  const { currentFile, currentYouTube, setCurrentYouTube } = usePlayerStore();

  // Navigate to player when media is loaded
  useEffect(() => {
    if (currentFile || currentYouTube) {
      navigate("/player");
    }
  }, [currentFile, currentYouTube, navigate]);

  // Handle YouTube video ID submission
  const handleVideoIdSubmit = (videoId: string) => {
    setCurrentYouTube({ id: videoId });
  };

  return (
    <AppLayout>
      {/* Input Sections: File Uploader and YouTube Input */}
      <div className="relative bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 p-3 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm mb-3 sm:mb-6 border border-purple-100/50 dark:border-purple-800/20 overflow-hidden flex-shrink-0 mt-0 sm:mt-8">
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

      {/* Media History - also typically outside normal flex flow */}
      <MediaHistory />
    </AppLayout>
  );
};
