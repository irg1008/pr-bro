import { cn } from "@/lib/utils";
import { Clock, Repeat, Target, TrendingUp } from "lucide-react";
import React from "react";

interface TargetDisplayProps {
  targetSets?: string | null;
  targetReps?: string | null;
  targetType?: "REPS" | "DURATION" | null;
  targetRepsToFailure?: string | null;
  incrementValue?: number | string | null;
  className?: string;
  asGrid?: boolean;
}

export const TargetDisplay: React.FC<TargetDisplayProps> = ({
  targetSets,
  targetReps,
  targetType = "REPS",
  targetRepsToFailure,
  incrementValue,
  className,
  asGrid
}) => {
  if (!targetSets && !targetReps && !targetRepsToFailure && !incrementValue) return null;

  const isDuration = targetType === "DURATION";

  return (
    <div
      className={cn(
        "items-center gap-2 text-xs text-muted-foreground",
        asGrid ? "grid grid-cols-2 sm:flex sm:flex-wrap" : "flex",
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
        <span
          className="flex items-center gap-1"
          title={isDuration ? "Target duration" : "Target reps"}
        >
          {isDuration ? <Clock className="h-3 w-3" /> : <Target className="h-3 w-3" />}
          {targetReps} {isDuration ? "secs" : "reps"}
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
