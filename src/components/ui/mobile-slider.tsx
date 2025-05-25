import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

interface MobileSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const MobileSlider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
}: MobileSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [initialValue, setInitialValue] = useState(0);

  // Calculate percentage for positioning
  const percentage = max !== min ? ((value - min) / (max - min)) * 100 : 0;

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (trackRef.current) {
      const touchX = e.touches[0].clientX;
      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      const offsetX = touchX - rect.left;
      
      // Calculate value from touch position
      const newPercentage = Math.max(0, Math.min(100, (offsetX / trackWidth) * 100));
      const newValue = min + (newPercentage / 100) * (max - min);
      
      // Round to step precision
      const steppedValue = Math.round(newValue / step) * step;
      
      onChange(steppedValue);
      
      setIsDragging(true);
      setTouchStartX(touchX);
      setInitialValue(steppedValue);
      
      // Add global event listeners
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    }
  };

  // Handle touch move
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && trackRef.current) {
      const touchX = e.touches[0].clientX;
      const touchDelta = touchX - touchStartX;
      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      
      // Calculate value change based on drag distance
      const valueDelta = (touchDelta / trackWidth) * (max - min);
      let newValue = initialValue + valueDelta;
      
      // Clamp to min/max
      newValue = Math.max(min, Math.min(max, newValue));
      
      // Round to step precision
      const steppedValue = Math.round(newValue / step) * step;
      
      onChange(steppedValue);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Remove global event listeners
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  // Handle direct track tap
  const handleTrackTap = (e: React.MouseEvent) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      const offsetX = e.clientX - rect.left;
      
      // Calculate value from click position
      const newPercentage = Math.max(0, Math.min(100, (offsetX / trackWidth) * 100));
      const newValue = min + (newPercentage / 100) * (max - min);
      
      // Round to step precision
      const steppedValue = Math.round(newValue / step) * step;
      
      onChange(steppedValue);
    }
  };

  return (
    <div
      className={cn(
        "relative h-12 touch-none select-none",
        className
      )}
      ref={trackRef}
      onTouchStart={handleTouchStart}
      onClick={handleTrackTap}
    >
      {/* Track background */}
      <div 
        className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        {/* Filled track */}
        <div
          className="absolute top-0 left-0 bottom-0 bg-purple-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Thumb */}
      <div
        ref={thumbRef}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-purple-500 rounded-full shadow-md transition-shadow",
          isDragging ? "shadow-lg scale-110" : ""
        )}
        style={{ left: `${percentage}%` }}
      />
      
      {/* Larger touch target */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 opacity-0"
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
};
