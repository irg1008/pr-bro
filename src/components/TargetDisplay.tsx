import { cn } from "@/lib/utils";
import { Repeat, Target, TrendingUp } from "lucide-react";
import React from "react";

interface TargetDisplayProps {
  targetSets?: string | null;
  targetReps?: string | null;
  targetRepsToFailure?: string | null;
  incrementValue?: number | string | null;
  className?: string;
}

export const TargetDisplay: React.FC<TargetDisplayProps> = ({
  targetSets,
  targetReps,
  targetRepsToFailure,
  incrementValue,
  className
}) => {
  if (!targetSets && !targetReps && !targetRepsToFailure && !incrementValue) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs text-muted-foreground",
        className
      )}
    >
      {targetSets && (
        <span className="flex items-center gap-1" title="Target sets">
          <Repeat className="h-3 w-3" />
          {targetSets} sets
        </span>
      )}
      {targetReps && (
        <span className="flex items-center gap-1" title="Target reps">
          <Target className="h-3 w-3" />
          {targetReps} reps
        </span>
      )}
      {incrementValue && (
        <span
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium"
          title="Double Progression Increment"
        >
          <TrendingUp className="h-3 w-3" />+{incrementValue}kg
        </span>
      )}
      {targetRepsToFailure && (
        <span
          className="flex items-center gap-1 text-orange-600 dark:text-orange-400"
          title="Reps In Reserve (Reverse Failure)"
        >
          🔥 {targetRepsToFailure} RIF
        </span>
      )}
    </div>
  );
};
