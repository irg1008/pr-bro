import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Info, Repeat, Target, TrendingUp } from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import React from "react";

interface ExerciseInfoModalProps {
  exercise: Exercise;
}

export const ExerciseInfoModal: React.FC<ExerciseInfoModalProps> = ({ exercise }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize text-2xl">{exercise.name}</DialogTitle>
          <DialogDescription className="capitalize">
            {exercise.bodyPart} {exercise.target ? `• ${exercise.target}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
          <div className="space-y-6 py-4">
            {exercise.imageUrl && (
              <div className="rounded-lg overflow-hidden border bg-muted/50 flex justify-center">
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="w-full h-auto object-contain max-h-96"
                  loading="lazy"
                />
              </div>
            )}

            {exercise.description && (
              <div className="prose dark:prose-invert text-sm">
                <p>{exercise.description}</p>
              </div>
            )}

            {/* Performance Targets (if available) */}
            {(exercise as any).targetSets ||
            (exercise as any).targetReps ||
            (exercise as any).incrementValue ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Performance Targets</h4>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed">
                  {(exercise as any).targetSets && (
                    <span className="flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5" />
                      {(exercise as any).targetSets} sets
                    </span>
                  )}
                  {(exercise as any).targetReps && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {(exercise as any).targetReps} reps
                    </span>
                  )}
                  {(exercise as any).incrementValue && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      <TrendingUp className="h-3.5 w-3.5" />+{(exercise as any).incrementValue}kg
                    </span>
                  )}
                  {(exercise as any).targetRepsToFailure && (
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                      🔥 {(exercise as any).targetRepsToFailure} RIF
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Muscle Targets</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.target && (
                  <Badge variant="default" className="capitalize">
                    {exercise.target}
                  </Badge>
                )}
                {exercise.secondaryMuscles &&
                  exercise.secondaryMuscles.map((m) => (
                    <Badge key={m} variant="secondary" className="capitalize">
                      {m}
                    </Badge>
                  ))}
              </div>
            </div>

            {exercise.instructions && exercise.instructions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  {exercise.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
