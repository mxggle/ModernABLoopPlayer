import type { TFunction } from "i18next";
import { toast } from "react-hot-toast";
import i18n from "../../i18n";
import { getPlatform } from "../../utils/platform";

export const revealInFileManager = async (targetPath: string): Promise<boolean> => {
  const success = await window.electronAPI?.showInFileManager(targetPath);

  if (!success) {
    toast.error(i18n.t("common.failedToOpenLocation"));
    return false;
  }

  return true;
};

export const getShowInFileManagerLabel = (t: TFunction): string => {
  const platform = getPlatform();

  if (platform === "darwin") {
    return t("common.showInFinder");
  }

  if (platform === "win32") {
    return t("common.showInExplorer");
  }

  return t("common.showInFileManager");
};
