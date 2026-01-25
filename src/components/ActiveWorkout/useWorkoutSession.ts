import { useHaptic } from "@/hooks/useHaptic";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ActiveWorkoutExercise, ProgressionDifference, WorkoutSet } from "./types";

export interface UseWorkoutSessionProps {
  logId: string;
  initialExercises: ActiveWorkoutExercise[];
  initialSupersetStatus: Record<string, boolean>;
  isDeload: boolean;
  routineId: string;
  routineExerciseIds: string[];
}

export const useWorkoutSession = ({
  logId,
  initialExercises,
  initialSupersetStatus,
  isDeload: initialIsDeload,
  routineId
}: UseWorkoutSessionProps) => {
  const [sets, setSets] = useState<Record<string, WorkoutSet[]>>({});
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const [activeExercises, setActiveExercises] = useState<ActiveWorkoutExercise[]>(initialExercises);
  const [supersetStatus, setSupersetStatus] =
    useState<Record<string, boolean>>(initialSupersetStatus);
  const [isDeload, setIsDeload] = useState(initialIsDeload);
  const [progressionDiffs, setProgressionDiffs] = useState<ProgressionDifference[]>([]);

  const haptic = useHaptic();
  const sessionInitialized = useRef(false);

  // --- Initial State Hydration ---
  useEffect(() => {
    if (sessionInitialized.current) return;

    const initialNotes: Record<string, string> = {};

    initialExercises.forEach((ex) => {
      // Hydrate notes if provided
      if (ex.sessionNote) initialNotes[ex.id] = ex.sessionNote;
    });

    if (Object.keys(initialNotes).length > 0) setSessionNotes(initialNotes);

    sessionInitialized.current = true;
  }, [initialExercises]);

  // --- Helpers ---
  const isExerciseComplete = useCallback(
    (exerciseId: string): boolean => {
      const exerciseSets = sets[exerciseId] || [];
      if (exerciseSets.length === 0) return false;
      return exerciseSets.every((set) => set.completed);
    },
    [sets]
  );

  const isWorkoutComplete = useCallback((): boolean => {
    if (activeExercises.length === 0) return false;
    return activeExercises.every((ex) => isExerciseComplete(ex.id));
  }, [activeExercises, isExerciseComplete]);

  // --- Actions ---
  const toggleDeload = async () => {
    const newState = !isDeload;
    setIsDeload(newState);
    const { error } = await actions.routine.updateRoutine({ id: routineId, isDeload: newState });
    if (!error) {
      toast.success(newState ? "Deload mode activated" : "Deload mode disabled");
    } else {
      toast.error("Failed to update deload status");
      setIsDeload(!newState);
    }
  };

  const addSet = (exerciseId: string, type: "WEIGHT" | "CARDIO" = "WEIGHT") => {
    setSets((prev) => {
      const exerciseSets = prev[exerciseId] || [];
      const lastSet = exerciseSets[exerciseSets.length - 1];

      const newSet: WorkoutSet =
        type === "CARDIO"
          ? {
              duration: lastSet?.duration || "",
              distance: lastSet?.distance || "",
              completed: false,
              type: "NORMAL"
            }
          : {
              weight: lastSet?.weight || "",
              reps: lastSet?.reps || "",
              completed: false,
              type: "NORMAL"
            };

      return { ...prev, [exerciseId]: [...exerciseSets, newSet] };
    });
    haptic.impactLight();
  };

  const updateSet = (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => {
    setSets((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      exerciseSets[setIndex] = { ...exerciseSets[setIndex], ...data };
      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    setSets((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      exerciseSets.splice(setIndex, 1);
      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const toggleSetCompleted = (exerciseId: string, setIndex: number) => {
    setSets((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      const newState = !exerciseSets[setIndex].completed;
      exerciseSets[setIndex] = { ...exerciseSets[setIndex], completed: newState };

      if (newState) haptic.impactMedium();
      else haptic.impactLight();
      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const handleFinish = async () => {
    const { error } = await actions.workout.finish({
      id: logId,
      entries: sets,
      supersetStatus,
      notes: sessionNotes,
      isDeload
    });

    if (!error) {
      toast.success("Workout finished successfully!");
      navigate("/");
    } else {
      toast.error("Failed to finish workout");
    }
  };

  const handleCancel = async () => {
    const { error } = await actions.workout.cancel({ id: logId });
    if (!error) {
      toast.success("Workout cancelled");
      navigate("/");
    } else {
      toast.error("Failed to cancel workout");
    }
  };

  const handleReset = async () => {
    const { data, error } = await actions.workout.reset({ id: logId });
    if (!error && data) {
      // @ts-ignore
      setActiveExercises(data.exercises);
      setSets(data.sets);
      setSupersetStatus(data.supersetStatus);
      setSessionNotes({});
      toast.success("Workout reset to routine defaults");
    } else {
      toast.error("Failed to reset workout");
    }
  };

  const applyOverload = async (exerciseId?: string) => {
    const { data, error } = await actions.workout.applyOverload({ logId, exerciseId });
    if (!error && data) {
      setSets((prev) => ({ ...prev, ...data.newSets }));
      const successful = data.results?.filter((r) => r.applied && r.diff) || [];
      if (successful.length > 0) {
        setProgressionDiffs(successful.map((r) => r.diff));
        toast.success("Progressive overload applied");
        return true;
      } else {
        const reason =
          data.results?.[0]?.reason || "No exercises qualified for weight increase yet.";
        toast.info(reason);
        return false;
      }
    } else {
      toast.error("Failed to apply overload");
      return false;
    }
  };

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    setActiveExercises((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    haptic.impactLight();
  };

  const removeExercise = (index: number) => {
    setActiveExercises((prev) => prev.filter((_, i) => i !== index));
    haptic.impactLight();
  };

  const addExercise = (exercise: ActiveWorkoutExercise) => {
    setActiveExercises((prev) => [...prev, exercise]);
    toast.success(`${exercise.name} added to workout`);
  };

  const replaceExercise = (index: number, newExercise: ActiveWorkoutExercise) => {
    setActiveExercises((prev) => {
      const next = [...prev];
      next[index] = newExercise;
      return next;
    });
  };

  const loadLastRun = async (exerciseId: string) => {
    const { data, error } = await actions.workout.getLastRoutineRun({ logId });
    if (!error && data && data.found) {
      const historyData = data.data;
      if (historyData?.sets[exerciseId]) {
        setSets((prev) => ({ ...prev, [exerciseId]: historyData.sets[exerciseId] }));
        if (historyData.sessionNotes?.[exerciseId]) {
          setSessionNotes((prev) => ({
            ...prev,
            [exerciseId]: historyData.sessionNotes[exerciseId]
          }));
        }
        if (historyData.supersetStatus?.[exerciseId]) {
          setSupersetStatus((prev) => ({ ...prev, [exerciseId]: true }));
        }
        toast.success(
          `History loaded for ${activeExercises.find((e) => e.id === exerciseId)?.name}`
        );
      } else {
        toast.info("No history found for this specific exercise in this routine.");
      }
    } else {
      toast.info("No previous run found.");
    }
  };

  return {
    sets,
    setSets,
    sessionNotes,
    setSessionNotes,
    activeExercises,
    setActiveExercises,
    supersetStatus,
    setSupersetStatus,
    isDeload,
    toggleDeload,
    progressionDiffs,
    setProgressionDiffs,
    isExerciseComplete,
    isWorkoutComplete,
    addSet,
    updateSet,
    removeSet,
    toggleSetCompleted,
    handleFinish,
    handleCancel,
    handleReset,
    applyOverload,
    handleMoveExercise,
    removeExercise,
    addExercise,
    replaceExercise,
    loadLastRun
  };
};
