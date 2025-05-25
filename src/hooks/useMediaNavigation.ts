import { useNavigate } from "react-router-dom";
import { usePlayerStore, type MediaHistoryItem } from "../stores/playerStore";

export const useMediaNavigation = () => {
  const navigate = useNavigate();
  const { loadFromHistory } = usePlayerStore();

  const navigateToMedia = async (item: MediaHistoryItem) => {
    // Load the media first and wait for it to complete
    await loadFromHistory(item.id);
    // Navigate to player after loading is complete
    navigate("/player");
  };

  const navigateToPlayer = () => {
    navigate("/player");
  };

  const navigateToHome = () => {
    navigate("/");
  };

  return {
    navigateToMedia,
    navigateToPlayer,
    navigateToHome,
  };
};
