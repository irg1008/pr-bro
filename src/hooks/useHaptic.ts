import { useCallback } from "react";

export const useHaptic = () => {
  const trigger = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const success = useCallback(() => {
    trigger([10, 30, 10]); // Short double pulse
  }, [trigger]);

  const error = useCallback(() => {
    trigger([50, 50, 50]); // Longer triple pulse
  }, [trigger]);

  const impactLight = useCallback(() => {
    trigger(10); // Very short tick
  }, [trigger]);

  const impactMedium = useCallback(() => {
    trigger(20);
  }, [trigger]);

  const impactHeavy = useCallback(() => {
    trigger(40);
  }, [trigger]);

  return {
    trigger,
    success,
    error,
    impactLight,
    impactMedium,
    impactHeavy
  };
};
