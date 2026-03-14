import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";

export interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

interface LayoutSettingsContextValue {
  layoutSettings: LayoutSettings;
  setLayoutSettings: Dispatch<SetStateAction<LayoutSettings>>;
}

const defaultSettings: LayoutSettings = {
  showPlayer: true,
  showWaveform: true,
  showTranscript: true,
  showControls: true,
};

export const LayoutSettingsContext = createContext<LayoutSettingsContextValue>({
  layoutSettings: defaultSettings,
  setLayoutSettings: () => {},
});

export const useLayoutSettings = () => useContext(LayoutSettingsContext);

export const LayoutSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(defaultSettings);
  return (
    <LayoutSettingsContext.Provider value={{ layoutSettings, setLayoutSettings }}>
      {children}
    </LayoutSettingsContext.Provider>
  );
};
