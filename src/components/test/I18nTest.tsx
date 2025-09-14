import React from "react";
import { useTranslation } from "react-i18next";

export const I18nTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  const testKeys = [
    "common.settings",
    "home.chooseMediaSource",
    "settings.playback",
    "player.play",
    "upload.dragDrop"
  ];

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4">i18n Test Component</h3>
      <p className="mb-2">Current language: <strong>{i18n.language}</strong></p>
      
      <div className="space-y-2">
        <h4 className="font-medium">Sample translations:</h4>
        {testKeys.map((key) => (
          <div key={key} className="text-sm">
            <span className="text-gray-500">{key}:</span> {t(key)}
          </div>
        ))}
      </div>

      <div className="mt-4 space-x-2">
        <button 
          onClick={() => i18n.changeLanguage('en')}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          English
        </button>
        <button 
          onClick={() => i18n.changeLanguage('zh')}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          中文
        </button>
        <button 
          onClick={() => i18n.changeLanguage('ja')}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
        >
          日本語
        </button>
      </div>
    </div>
  );
};
