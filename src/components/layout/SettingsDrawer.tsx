import React from "react";
import { Button } from "../ui/button";
import { cn } from "../../utils/cn";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "../../stores/playerStore";
import { useTranslation } from "react-i18next";
import {
  X,
  LayoutDashboard,
  History as HistoryIcon, // Renamed to avoid conflict if History component is imported
  Eye,
  EyeOff,
  Tv,
  Waves,
  FileText,
  SlidersHorizontal,
  Brain,
} from "lucide-react";
import { Input } from "../ui/input";
import { LanguageSelector } from "../ui/LanguageSelector";

interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: React.Dispatch<React.SetStateAction<LayoutSettings>>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  layoutSettings,
  setLayoutSettings,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    seekStepSeconds,
    seekSmallStepSeconds,
    setSeekStepSeconds,
    setSeekSmallStepSeconds,
  } = usePlayerStore();

  const handleOpenHistory = () => {
    const historyToggleButton = document.getElementById("historyDrawerToggle");
    if (historyToggleButton) {
      historyToggleButton.click();
    }
    onClose(); // Close settings drawer after triggering history
  };

  const handleOpenAISettings = () => {
    navigate("/ai-settings");
    onClose(); // Close settings drawer after navigation
  };

  const layoutOptions = [
    {
      key: "showPlayer",
      label: t("settings.mediaPlayer"),
      icon: <Tv className="h-5 w-5 mr-3 text-sky-500" />,
    },
    {
      key: "showWaveform",
      label: t("settings.waveformDisplay"),
      icon: <Waves className="h-5 w-5 mr-3 text-teal-500" />,
    },
    {
      key: "showTranscript",
      label: t("settings.transcriptPanel"),
      icon: <FileText className="h-5 w-5 mr-3 text-orange-500" />,
    },
    {
      key: "showControls",
      label: t("settings.playbackControls"),
      icon: <SlidersHorizontal className="h-5 w-5 mr-3 text-rose-500" />,
    },
  ];

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-40 w-full sm:w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center">
            <LayoutDashboard className="h-5 w-5 mr-2 text-purple-500" />
            {t("settings.title")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Playback Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
              {t("settings.playback")}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700 dark:text-gray-200 flex-1">
                  {t("settings.seekStep")}
                </label>
                <div className="w-28">
                  <Input
                    type="number"
                    min={0.1}
                    max={120}
                    step={0.1}
                    value={seekStepSeconds}
                    onChange={(e) =>
                      setSeekStepSeconds(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700 dark:text-gray-200 flex-1">
                  {t("settings.smallStep")}
                </label>
                <div className="w-28">
                  <Input
                    type="number"
                    min={0.05}
                    max={10}
                    step={0.05}
                    value={seekSmallStepSeconds}
                    onChange={(e) =>
                      setSeekSmallStepSeconds(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Language Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
              {t("settings.appearance")}
            </h3>
            <LanguageSelector />
          </div>

          {/* Layout Settings Section - Only show when layoutSettings and setLayoutSettings are available */}
          {layoutSettings && setLayoutSettings && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
                {t("settings.interfaceLayout")}
              </h3>
              <div className="space-y-1">
                {layoutOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() =>
                      setLayoutSettings((prev) => ({
                        ...prev,
                        [option.key]: !prev[option.key as keyof LayoutSettings],
                      }))
                    }
                    className="w-full flex items-center px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {option.icon}
                    <span className="flex-grow text-left">{option.label}</span>
                    {layoutSettings[option.key as keyof LayoutSettings] ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Settings Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
              {t("settings.aiServices")}
            </h3>
            <Button
              variant="outline"
              onClick={handleOpenAISettings}
              className="w-full justify-start text-sm"
            >
              <Brain className="h-5 w-5 mr-3 text-purple-500" />
              {t("settings.aiSettings")}
            </Button>
          </div>

          {/* Media History Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
              {t("settings.media")}
            </h3>
            <Button
              variant="outline"
              onClick={handleOpenHistory}
              className="w-full justify-start text-sm"
            >
              <HistoryIcon className="h-5 w-5 mr-3 text-indigo-500" />
              {t("settings.viewMediaHistory")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
