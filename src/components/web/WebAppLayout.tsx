import { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { AppLayoutBase } from "../layout/AppLayoutBase";

interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

interface WebAppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
}

export const WebAppLayout = ({
  children,
  layoutSettings,
  setLayoutSettings,
}: WebAppLayoutProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const navigateToHome = () => {
    const { setCurrentFile, setCurrentYouTube } = usePlayerStore.getState();
    setCurrentFile(null);
    setCurrentYouTube(null);
    navigate("/");
  };

  const headerLeadingSlot = (
    <button
      onClick={navigateToHome}
      className="flex items-center gap-1 sm:gap-2 focus:outline-none shrink-0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        className="h-8 sm:h-9 w-auto fill-current text-purple-600"
        aria-label={t("app.logoLabel")}
      >
        <g transform="translate(0,1024) scale(0.1,-0.1)">
          <path d="M3246 7708 c-4 -24 -18 -92 -31 -153 -13 -60 -26 -121 -29 -135 -2 -14 -11 -56 -19 -95 -9 -38 -18 -83 -20 -100 -8 -47 -158 -811 -172 -875 -3 -14 -8 -38 -11 -55 -2 -16 -37 -187 -75 -380 -39 -192 -73 -361 -75 -375 -3 -14 -7 -32 -9 -40 -2 -8 -7 -31 -10 -50 -3 -19 -121 -609 -262 -1310 -140 -701 -257 -1284 -259 -1295 -2 -11 -15 -76 -29 -144 -14 -68 -25 -132 -25 -142 0 -18 51 -19 1813 -19 1174 0 1851 4 1922 10 712 67 1267 502 1450 1135 41 141 55 246 55 400 0 307 -81 568 -244 788 -192 260 -427 420 -703 477 l-58 12 72 28 c320 123 565 431 649 815 9 39 18 129 21 200 12 283 -76 580 -237 807 -217 305 -566 485 -1020 527 -75 7 -563 11 -1401 11 l-1286 0 -7 -42z m989 -828 c14 -5 52 -31 84 -57 206 -169 338 -278 347 -288 12 -11 25 -22 739 -620 281 -235 517 -435 525 -444 60 -63 85 -162 56 -223 -20 -42 -111 -130 -246 -240 -120 -97 -135 -110 -294 -241 -186 -154 -268 -222 -1021 -840 -148 -122 -370 -305 -493 -407 -146 -122 -240 -193 -275 -207 -64 -27 -154 -30 -203 -7 -60 29 -124 143 -124 223 0 37 35 211 164 801 24 113 54 252 66 310 12 58 24 112 25 120 19 84 50 229 85 390 44 208 70 326 75 350 2 8 31 143 65 300 72 338 104 485 130 600 10 47 21 96 24 110 43 218 67 298 98 328 48 45 120 62 173 42z" />
          <path d="M4725 5688 c-263 -211 -602 -508 -615 -537 -9 -23 -8 -35 3 -62 8 -19 105 -132 216 -251 166 -180 208 -219 241 -229 44 -13 94 0 105 29 6 16 68 346 80 427 3 22 14 87 24 145 10 58 24 139 31 180 14 81 17 102 25 140 15 71 17 160 5 175 -21 25 -71 18 -115 -17z" />
        </g>
      </svg>
      <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
        LoopMate
      </h1>
    </button>
  );

  return (
    <AppLayoutBase
      layoutSettings={layoutSettings}
      setLayoutSettings={setLayoutSettings}
      headerLeadingSlot={headerLeadingSlot}
      containerClassName="max-w-5xl mx-auto overflow-x-hidden"
    >
      {children}
    </AppLayoutBase>
  );
};
