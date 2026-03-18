/**
 * AppLayout – public facade used by all pages.
 *
 * This file contains the single isElectron() call that selects between the
 * Electron and web layout shells. Neither shell imports the other, and shared
 * chrome lives in AppLayoutBase.
 *
 * Allowed to call isElectron(): YES – this is the designated platform selector.
 */
import { Dispatch, SetStateAction } from "react";
import { isElectron } from "../../utils/platform";
import { ElectronAppLayout } from "../electron/ElectronAppLayout";
import { WebAppLayout } from "../web/WebAppLayout";

interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

interface AppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
  bottomPaddingClassName?: string;
}

export const AppLayout = (props: AppLayoutProps) => {
  return isElectron() ? <ElectronAppLayout {...props} /> : <WebAppLayout {...props} />;
};
