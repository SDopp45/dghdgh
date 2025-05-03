import { useState, useCallback } from "react";
import { AnimationControls, useAnimation } from "framer-motion";

interface UseAnimationStateProps {
  onComplete?: () => void;
}

interface AnimationState {
  isAnimating: boolean;
  controls: AnimationControls;
  startAnimation: (animation: string) => Promise<void>;
  resetAnimation: () => void;
}

export function useAnimationState({ onComplete }: UseAnimationStateProps = {}): AnimationState {
  const [isAnimating, setIsAnimating] = useState(false);
  const controls = useAnimation();

  const startAnimation = useCallback(async (animation: string) => {
    setIsAnimating(true);
    await controls.start(animation);
    setIsAnimating(false);
    onComplete?.();
  }, [controls, onComplete]);

  const resetAnimation = useCallback(() => {
    controls.set("initial");
    setIsAnimating(false);
  }, [controls]);

  return {
    isAnimating,
    controls,
    startAnimation,
    resetAnimation,
  };
}
