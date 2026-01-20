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
import { Info } from "lucide-react";
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

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Targets</h4>
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
