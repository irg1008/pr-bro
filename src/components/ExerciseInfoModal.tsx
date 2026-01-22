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
          className="text-muted-foreground hover:text-primary h-6 w-6"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl capitalize">{exercise.name}</DialogTitle>
          <DialogDescription className="capitalize">
            {exercise.bodyPart} {exercise.target ? `• ${exercise.target}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="space-y-6 py-4">
            {exercise.imageUrl && (
              <div className="bg-muted/50 flex justify-center overflow-hidden rounded-lg border">
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="h-auto max-h-96 w-full bg-white object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {exercise.description && (
              <div className="prose dark:prose-invert text-sm">
                <p>{exercise.description}</p>
              </div>
            )}

            {/* Performance Targets removed as per user request */}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Muscle targets</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.target && <Badge className="capitalize">{exercise.target}</Badge>}
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
                <ol className="text-muted-foreground list-inside list-decimal space-y-2 text-sm">
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
