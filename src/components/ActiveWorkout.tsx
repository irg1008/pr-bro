import { ExerciseSelector } from "@/components/ExerciseSelector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, PartyPopper } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { ExerciseCard } from "./ActiveWorkout/ExerciseCard";
import type { ActiveWorkoutExercise, ActiveWorkoutProps } from "./ActiveWorkout/types";
import { useWorkoutSession } from "./ActiveWorkout/useWorkoutSession";
import { WorkoutActions } from "./ActiveWorkout/WorkoutActions";
import { WorkoutHeader } from "./ActiveWorkout/WorkoutHeader";

export const ActiveWorkout = (props: ActiveWorkoutProps) => {
  const session = useWorkoutSession({
    logId: props.logId,
    initialExercises: props.exercises,
    initialSupersetStatus: props.initialSupersetStatus || {},
    isDeload: props.isDeload || false,
    routineId: props.routineId,
    routineExerciseIds: props.routineExerciseIds
  });

  const [reorderMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace">("add");
  const [targetIndex, setTargetIndex] = useState(-1);
  const [congratsModalOpen, setCongratsModalOpen] = useState(false);

  // Auto-finish detection
  useEffect(() => {
    if (session.isWorkoutComplete() && !congratsModalOpen) {
      setCongratsModalOpen(true);
    }
  }, [session.isWorkoutComplete()]);

  const handleExerciseSelect = (exercise: any) => {
    const activeEx: ActiveWorkoutExercise = {
      ...exercise,
      routineNote: null,
      sessionNote: null,
      targetSets: null,
      targetReps: null,
      targetType: null,
      targetRepsToFailure: null,
      incrementValue: null
    };

    if (pickerMode === "add") {
      session.addExercise(activeEx);
    } else {
      session.replaceExercise(targetIndex, activeEx);
    }
    setPickerOpen(false);
  };

  return (
    <div className="container mx-auto max-w-xl px-4 pb-32">
      <WorkoutHeader
        routineName={props.routineName}
        initialStartTime={props.initialStartTime}
        isDeload={session.isDeload}
        onToggleDeload={session.toggleDeload}
      />

      <div className="mt-4 flex flex-col gap-6">
        <AnimatePresence>
          {session.activeExercises.map((ex, idx) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={idx}
              sets={session.sets[ex.id] || []}
              sessionNote={session.sessionNotes[ex.id] || ""}
              isSuperset={session.supersetStatus[ex.id] || false}
              isComplete={session.isExerciseComplete(ex.id)}
              reorderMode={reorderMode}
              totalExercises={session.activeExercises.length}
              isDeload={session.isDeload}
              onUpdateSet={(sIdx, data) => session.updateSet(ex.id, sIdx, data)}
              onAddSet={() => session.addSet(ex.id, ex.type)}
              onRemoveSet={(sIdx) => session.removeSet(ex.id, sIdx)}
              onToggleSetComplete={(sIdx) => session.toggleSetCompleted(ex.id, sIdx)}
              onUpdateSessionNote={(note) =>
                session.setSessionNotes((prev) => ({ ...prev, [ex.id]: note }))
              }
              onToggleSuperset={() =>
                session.setSupersetStatus((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))
              }
              onRemoveExercise={() => session.removeExercise(idx)}
              onReplaceExercise={() => {
                setPickerMode("replace");
                setTargetIndex(idx);
                setPickerOpen(true);
              }}
              onMoveUp={() => session.handleMoveExercise(idx, "up")}
              onMoveDown={() => session.handleMoveExercise(idx, "down")}
              onApplyOverload={() => session.applyOverload(ex.id)}
              onLoadLastRun={() => session.loadLastRun(ex.id)}
            />
          ))}
        </AnimatePresence>

        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-8">
          <Button
            variant="outline"
            onClick={() => {
              setPickerMode("add");
              setPickerOpen(true);
            }}
          >
            Add exercise
          </Button>
        </div>
      </div>

      <WorkoutActions
        onFinish={session.handleFinish}
        onCancel={session.handleCancel}
        onReset={session.handleReset}
        onAddExercise={() => {
          setPickerMode("add");
          setPickerOpen(true);
        }}
        isComplete={session.isWorkoutComplete()}
      />

      {/* Modals */}
      <ExerciseSelector
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleExerciseSelect}
        selectedExerciseIds={session.activeExercises.map((e) => e.id)}
        routineExercises={props.routineExercisesList}
        trigger={<div className="hidden" />}
      />

      {/* Congrats Modal */}
      <Dialog open={congratsModalOpen} onOpenChange={setCongratsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="bg-accent/20 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <PartyPopper className="text-accent h-10 w-10" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Great session!</h2>
            <p className="text-muted-foreground mb-6">
              You've completed all exercises in this routine.
            </p>
            <Button
              onClick={session.handleFinish}
              size="lg"
              className="focus:ring-accent w-full gap-2 font-bold"
            >
              Finish workout <ArrowRight size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCongratsModalOpen(false)}
              className="text-muted-foreground mt-2"
            >
              Keep checking sets
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
