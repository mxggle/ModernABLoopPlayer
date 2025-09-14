import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "./button";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
];

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t("common.language")}
      </h4>
      <div className="space-y-1">
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={i18n.language === language.code ? "default" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange(language.code)}
            className="w-full justify-start text-sm"
          >
            <span className="flex-1 text-left">
              {language.nativeName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {language.name}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};
