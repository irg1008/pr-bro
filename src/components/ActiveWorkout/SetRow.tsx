import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWarning } from "@/components/ui/InputWarning";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import type { ExerciseType } from "prisma/generated/client";
import { SetTypeSelector } from "../SetTypeSelector";
import type { WorkoutSet } from "./types";

interface SetRowProps {
  exerciseId: string;
  index: number;
  set: WorkoutSet;
  exerciseType: ExerciseType;
  inputWarning?: string;
  onUpdate: (data: Partial<WorkoutSet>) => void;
  onRemove: () => void;
  onToggleComplete: () => void;
}

export const SetRow = ({
  index,
  set,
  exerciseType,
  inputWarning,
  onUpdate,
  onRemove,
  onToggleComplete
}: SetRowProps) => {
  const isCardio = exerciseType === "CARDIO";

  return (
    <div
      className={`relative grid items-center gap-4 ${
        isCardio ? "grid-cols-[auto_1fr_1fr_1fr_auto]" : "grid-cols-[auto_auto_1fr_1fr_auto]"
      } ${set.completed ? "opacity-50" : ""}`}
    >
      {set.completed && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
          className="bg-foreground/30 pointer-events-none absolute top-1/2 right-10 left-0 z-10 h-0.5 origin-left"
        />
      )}

      {!isCardio && (
        <div className="flex cursor-pointer items-center justify-center" onClick={onToggleComplete}>
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
              set.completed
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-muted-foreground/50"
            }`}
          >
            {set.completed && <Check className="h-3.5 w-3.5" />}
          </div>
        </div>
      )}

      <SetTypeSelector
        setNumber={index + 1}
        type={set.type}
        onChange={(newType) => onUpdate({ type: newType })}
      />

      {isCardio ? (
        <>
          <Input
            type="number"
            value={set.duration ?? ""}
            onChange={(e) =>
              onUpdate({ duration: e.target.value === "" ? "" : Number(e.target.value) })
            }
            className="px-1 text-center"
            placeholder="0"
          />
          <Input
            type="number"
            value={set.distance ?? ""}
            onChange={(e) =>
              onUpdate({ distance: e.target.value === "" ? "" : Number(e.target.value) })
            }
            className="px-1 text-center"
            placeholder="0"
          />
          <Input
            type="number"
            value={set.calories ?? ""}
            onChange={(e) =>
              onUpdate({ calories: e.target.value === "" ? "" : Number(e.target.value) })
            }
            className="px-1 text-center"
            placeholder="0"
          />
        </>
      ) : (
        <>
          <div className="relative">
            <Input
              type="number"
              value={set.weight ?? ""}
              onChange={(e) =>
                onUpdate({ weight: e.target.value === "" ? "" : Number(e.target.value) })
              }
              className={cn(
                "text-center transition-colors",
                inputWarning && "border-amber-500 focus-visible:ring-amber-500"
              )}
              placeholder="0"
            />
            {inputWarning && <InputWarning message={inputWarning} />}
          </div>
          <div className="relative">
            <Input
              type="number"
              value={set.reps ?? ""}
              onChange={(e) =>
                onUpdate({ reps: e.target.value === "" ? "" : Number(e.target.value) })
              }
              className={cn("text-center transition-colors")}
              placeholder="0"
            />
          </div>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive h-8 w-8"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
