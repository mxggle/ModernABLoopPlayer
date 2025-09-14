import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface DrawerProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const Drawer = ({
  children,
  open,
  onOpenChange,
  title,
}: DrawerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Handle open state
  useEffect(() => {
    if (open) {
      // Show drawer
      setIsVisible(true);
      // Prevent body scrolling
      document.body.style.overflow = "hidden";
    } else {
      // Start closing animation
      setTimeout(() => {
        setIsVisible(false);
        // Restore body scrolling
        document.body.style.overflow = "";
      }, 300); // Match transition duration
    }

    return () => {
      // Cleanup
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  // Touch handlers for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchEnd - touchStart;
    const isDownSwipe = distance > 50; // Minimum swipe distance

    if (isDownSwipe) {
      onOpenChange(false);
    }

    // Reset values
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!isVisible && !open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl transform transition-transform duration-300 ease-in-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="h-1.5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2" />

        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};
