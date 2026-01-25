import { ExerciseInfoModal } from "@/components/ExerciseInfoModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  History,
  MessageSquareText,
  MoreVertical,
  Trash2,
  TrendingUp,
  Zap
} from "lucide-react";
import { motion } from "motion/react";
import { TargetDisplay } from "../TargetDisplay";
import { SetRow } from "./SetRow";
import type { ActiveWorkoutExercise, WorkoutSet } from "./types";

interface ExerciseCardProps {
  exercise: ActiveWorkoutExercise;
  index: number;
  sets: WorkoutSet[];
  sessionNote: string;
  isSuperset: boolean;
  isComplete: boolean;
  reorderMode: boolean;
  totalExercises: number;
  isDeload: boolean;
  onUpdateSet: (index: number, data: Partial<WorkoutSet>) => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  onToggleSetComplete: (index: number) => void;
  onUpdateSessionNote: (note: string) => void;
  onToggleSuperset: () => void;
  onRemoveExercise: () => void;
  onReplaceExercise: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onApplyOverload: () => void;
  onLoadLastRun: () => void;
}

export const ExerciseCard = ({
  exercise,
  index,
  sets,
  sessionNote,
  isSuperset,
  isComplete,
  reorderMode,
  totalExercises,
  isDeload,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onToggleSetComplete,
  onUpdateSessionNote,
  onToggleSuperset,
  onRemoveExercise,
  onReplaceExercise,
  onMoveUp,
  onMoveDown,
  onApplyOverload,
  onLoadLastRun
}: ExerciseCardProps) => {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: isComplete ? 0.6 : 1,
        scale: isComplete ? 0.95 : 1
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-card relative overflow-hidden rounded-xl border shadow-sm will-change-transform"
    >
      {reorderMode && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 opacity-90 shadow-sm hover:opacity-100"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 opacity-90 shadow-sm hover:opacity-100"
            onClick={onMoveDown}
            disabled={index === totalExercises - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {exercise.imageUrl && (
        <div className="bg-muted h-48 w-full shrink-0">
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="h-full w-full bg-white object-contain"
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="flex items-center gap-2 text-lg leading-none font-bold capitalize">
              {exercise.name}
              <ExerciseInfoModal exercise={exercise} />
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs capitalize">
                {exercise.bodyPart}
              </span>
              {exercise.target && (
                <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs capitalize">
                  {exercise.target}
                </span>
              )}
            </div>

            <TargetDisplay
              targetSets={exercise.targetSets}
              targetReps={exercise.targetReps}
              targetType={exercise.targetType}
              targetRepsToFailure={exercise.targetRepsToFailure}
              incrementValue={exercise.incrementValue}
              className="mt-1.5 w-fit"
              asGrid
            />

            {exercise.routineNote && (
              <div className="text-muted-foreground bg-muted/20 mt-2 w-fit rounded-r border-l-4 py-1 pr-2 pl-3 text-sm whitespace-pre-wrap">
                {exercise.routineNote}
              </div>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <div className="mt-2 w-fit cursor-pointer text-sm transition-opacity hover:opacity-80">
                  {sessionNote ? (
                    <div className="text-foreground/80 bg-background flex w-fit items-start gap-2 rounded-md border px-2 py-1.5">
                      <MessageSquareText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      <span className="leading-snug whitespace-pre-wrap">{sessionNote}</span>
                    </div>
                  ) : (
                    <div className="border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 flex w-fit items-center gap-2 rounded-md border border-dashed p-1.5 transition-colors">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      <span className="text-xs">Add insight</span>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Session note for {exercise.name}</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Textarea
                    placeholder="How did it feel? e.g. Heavy, easy, pain in shoulder..."
                    value={sessionNote}
                    onChange={(e) => onUpdateSessionNote(e.target.value)}
                    className="min-h-25"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Save</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center gap-1">
            {isSuperset && <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={onLoadLastRun}>
                  <History className="mr-2 h-4 w-4" />
                  Load last run
                </DropdownMenuItem>
                {!isDeload && (
                  <DropdownMenuItem onClick={onApplyOverload}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Apply overload
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onToggleSuperset}>
                  <Zap
                    className={`mr-2 h-4 w-4 ${isSuperset ? "fill-amber-500 text-amber-500" : ""}`}
                  />
                  <span className={isSuperset ? "font-bold text-amber-500" : ""}>
                    {isSuperset ? "Active superset" : "Toggle superset"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReplaceExercise}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Replace exercise
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onRemoveExercise}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove exercise
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {exercise.type === "CARDIO" ? (
          <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 text-sm font-medium">
            <div className="w-6 text-center">#</div>
            <div className="text-center">Minutes</div>
            <div className="text-center">Km</div>
            <div className="text-center">Calories</div>
            <div className="w-8"></div>
          </div>
        ) : (
          <div className="text-muted-foreground grid grid-cols-[auto_auto_1fr_1fr_auto] gap-4 text-sm font-medium">
            <div className="w-6"></div>
            <div className="w-8 text-center">#</div>
            <div className="text-center">Kg</div>
            <div className="text-center">
              {exercise.targetType === "DURATION" ? "Secs" : "Reps"}
            </div>
            <div className="w-8"></div>
          </div>
        )}

        {sets.map((set, idx) => (
          <SetRow
            key={idx}
            exerciseId={exercise.id}
            index={idx}
            set={set}
            exerciseType={exercise.type}
            onUpdate={(data) => onUpdateSet(idx, data)}
            onRemove={() => onRemoveSet(idx)}
            onToggleComplete={() => onToggleSetComplete(idx)}
          />
        ))}

        <Button variant="outline" className="w-full" onClick={onAddSet}>
          + Add set
        </Button>
      </div>
    </motion.div>
  );
};
