import { useTranslation } from "react-i18next";
import { YouTubeInput } from "../components/player/YouTubeInput";
import { FileUploader } from "../components/player/FileUploader";
import { FolderBrowser } from "../components/player/FolderBrowser";
import { PlayHistory } from "../components/player/PlayHistory";
import { motion } from "framer-motion";
import { Youtube, FileAudio } from "lucide-react";

interface ElectronHomePageProps {
  handleVideoIdSubmit: (videoId: string) => void;
}

export const ElectronHomePage = ({ handleVideoIdSubmit }: ElectronHomePageProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 min-h-[calc(100vh-80px)] bg-gray-50/30 dark:bg-gray-950/20">
      {/* Main Canvas - Studio Hero */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-8 py-10 lg:px-12"
      >
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Minimalist Hero */}
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-black tracking-tight text-gray-900 dark:text-white"
            >
              {t("home.startPracticing", "Start Practicing")}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-base text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed"
            >
              {t("home.studioDesc", "Open a local media file or stream from YouTube to begin your language mastery session.")}
            </motion.p>
          </div>

          {/* Unified Launcher Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Local Entry */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
              <div className="relative bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl h-full flex flex-col transition-all group-hover:border-purple-500/30 group-hover:shadow-2xl group-hover:shadow-purple-500/5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-indigo-500 transition-colors">Local File</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                  {t("home.localMedia")}
                </h3>
                <div className="flex-1 flex flex-col justify-center py-4">
                  <div className="uploader-studio-override">
                    <FileUploader />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* YouTube Entry */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
              <div className="relative bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl h-full flex flex-col transition-all group-hover:border-red-500/30 group-hover:shadow-2xl group-hover:shadow-red-500/5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-red-500 transition-colors">Cloud Stream</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                  {t("home.youtubeVideo")}
                </h3>
                <div className="flex-1 flex flex-col justify-center py-4">
                  <div className="youtube-studio-override">
                    <YouTubeInput onVideoIdSubmit={handleVideoIdSubmit} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Studio Footer / Info */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-6 border-t border-gray-200 dark:border-gray-800 pt-8"
          >
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <FolderSearch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("home.proTip", "Pro Tip: Batch Practice")}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t("home.electronHint", "Drag a folder to the sidebar to instantly map all media for a structured shadowing session.")}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.main>
      
      {/* Visual Overrides */}
      <style>{`
        .uploader-studio-override .border-dashed {
          border-radius: 1.5rem !important;
          background: rgba(0,0,0,0.02) !important;
        }
        .dark .uploader-studio-override .border-dashed {
          background: rgba(255,255,255,0.02) !important;
        }
      `}</style>
    </div>
  );
};
