import { useState } from "react";

/**
 * Interface for a set that can be verified.
 * Typically has weight and reps fields.
 */
export interface VerifiableSet {
  weight?: number | string | null;
  reps?: number | string | null;
  [key: string]: any;
}

export const useInputVerification = () => {
  // Key format: "uniqueContextId-setIndex-field"
  const [inputWarnings, setInputWarnings] = useState<Record<string, string>>({});

  const clearWarning = (uniqueContextId: string, index: number, field: "weight" | "reps") => {
    const key = `${uniqueContextId}-${index}-${field}`;
    if (inputWarnings[key]) {
      const newWarnings = { ...inputWarnings };
      delete newWarnings[key];
      setInputWarnings(newWarnings);
    }
  };

  const verifyInput = (
    sets: VerifiableSet[],
    idx: number,
    val: number,
    field: "weight" | "reps",
    uniqueContextId: string
  ) => {
    // Helper to set warning
    const warn = (msg: string) => {
      setInputWarnings((prev) => ({ ...prev, [`${uniqueContextId}-${idx}-${field}`]: msg }));
    };

    // Check Previous Set
    if (idx > 0) {
      const prevSet = sets[idx - 1];
      const prevVal = Number(prevSet[field]);
      if (prevVal > 0 && val > 0) {
        const increase = (val - prevVal) / prevVal;
        if (increase > 0.5) {
          warn(`+${Math.round(increase * 100)}% jump vs Set ${idx} (${prevVal})`);
          return;
        }
      }
    }

    // Check Next Set
    if (idx < sets.length - 1) {
      const nextSet = sets[idx + 1];
      const nextVal = Number(nextSet[field]);

      if (nextVal > 0 && val > 0) {
        const min = Math.min(val, nextVal);
        const max = Math.max(val, nextVal);
        if (min > 0) {
          const increase = (max - min) / min;
          if (increase > 0.5) {
            if (val > nextVal) {
              warn(`Huge vs Set ${idx + 2} (${nextVal})`);
            } else {
              warn(`Tiny vs Set ${idx + 2} (${nextVal})`);
            }
          }
        }
      }
    }
  };

  return { inputWarnings, verifyInput, clearWarning };
};
