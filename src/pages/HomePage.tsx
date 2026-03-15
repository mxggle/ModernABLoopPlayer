import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { isElectron } from "../utils/platform";
import { WebHomePage } from "./WebHomePage";
import { ElectronHomePage } from "./ElectronHomePage";

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
      {isElectron() ? (
        <ElectronHomePage handleVideoIdSubmit={handleVideoIdSubmit} />
      ) : (
        <WebHomePage handleVideoIdSubmit={handleVideoIdSubmit} />
      )}
    </AppLayout>
  );
};
