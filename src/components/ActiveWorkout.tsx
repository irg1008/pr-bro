import { ExerciseInfoModal } from "@/components/ExerciseInfoModal";
import { ExerciseSelector } from "@/components/ExerciseSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useHaptic } from "@/hooks/useHaptic";
import { applyProgressiveOverload } from "@/lib/progressive-overload";
import { cn } from "@/lib/utils";
import type { SetType } from "@/types/set-types";
import { navigate } from "astro:transitions/client";
import {
  Activity,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bike,
  Check,
  Dumbbell,
  Footprints,
  History,
  MessageSquareText,
  MoreVertical,
  PartyPopper,
  Plus,
  RotateCcw,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Waves,
  X,
  Zap
} from "lucide-react";
import { motion } from "motion/react";
import type { Exercise, ExerciseType } from "prisma/generated/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SetTypeSelector } from "./SetTypeSelector";
import { TargetDisplay } from "./TargetDisplay";

const InputWarning = ({ message }: { message: string }) => (
  <div className="absolute top-full left-0 right-0 z-10 mx-auto mt-1 w-max max-w-[200px] rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-400">
    {message}
  </div>
);

const CARDIO_OPTIONS = [
  { name: "Running", icon: Footprints },
  { name: "Walking", icon: Activity },
  { name: "Cycling", icon: Bike },
  { name: "Swimming", icon: Waves },
  { name: "HIIT", icon: Timer },
  { name: "Other", icon: Dumbbell }
];

// export type SetType = "NORMAL" | "WARMUP" | "FAILURE"; // Using shared type now

export interface WorkoutSet {
  weight?: number | "";
  reps?: number | "";
  duration?: number | ""; // minutes?
  distance?: number | ""; // km?
  calories?: number | "";
  completed: boolean;
  type?: SetType;
}

export interface ActiveWorkoutExercise extends Exercise {
  routineNote?: string | null;
  sessionNote?: string | null;
  targetSets?: string | null;
  targetReps?: string | null;
  targetType?: "REPS" | "DURATION" | null;
  targetRepsToFailure?: string | null;
  incrementValue?: number | null;
}

export interface ProgressionDifference {
  exerciseName: string;
  oldWeight: number;
  oldReps: number;
  newWeight: number;
  newReps: number;
  type: "PROMOTION" | "RESET";
}

export interface ActiveWorkoutProps {
  logId: string;
  initialStartTime: string;
  routineName: string;
  routineId: string;
  routineGroupId: string;
  routineExerciseIds: string[];
  exercises: ActiveWorkoutExercise[]; // Updated type
  initialSupersetStatus?: Record<string, boolean>;
  routineExercisesList?: { exerciseId: string; isActive?: boolean | null; exercise: Exercise }[]; // Full list from routine
}

export const ActiveWorkout = ({
  logId,
  initialStartTime,
  routineName,
  routineId,
  routineGroupId,
  routineExerciseIds,
  exercises: initialExercises,
  initialSupersetStatus = {},
  routineExercisesList = []
}: ActiveWorkoutProps) => {
  // ... (rest of component)
  // Carousel state removed
  // const [current, setCurrent] = useState(0); // Removed as we list all
  const [sets, setSets] = useState<Record<string, WorkoutSet[]>>({});
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({}); // New state for session notes

  // Dynamic Exercise State
  const [activeExercises, setActiveExercises] = useState<ActiveWorkoutExercise[]>(initialExercises);
  const [inputWarnings, setInputWarnings] = useState<Record<string, string>>({}); // Key: "exID-setIdx-field"
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace">("add");
  const [targetExerciseIndex, setTargetExerciseIndex] = useState<number>(-1); // For replace/delete context if needed

  const [cardioModalOpen, setCardioModalOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [missingTargetsAlertOpen, setMissingTargetsAlertOpen] = useState(false);
  const [missingTargetsExercises, setMissingTargetsExercises] = useState<ActiveWorkoutExercise[]>(
    []
  ); // Track for alert

  const [loadLastRunAlertOpen, setLoadLastRunAlertOpen] = useState(false);
  const haptic = useHaptic();

  /* ... inside ActiveWorkout component ... */
  const [resetAlertOpen, setResetAlertOpen] = useState(false);
  const [cancelAlertOpen, setCancelAlertOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const itemsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastMovedIndexRef = useRef<number | null>(null);

  // Double Progression Summary State
  const [progressionDiffs, setProgressionDiffs] = useState<ProgressionDifference[]>([]);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Workout completion state
  const [congratsModalOpen, setCongratsModalOpen] = useState(false);
  const [incompleteFinishAlertOpen, setIncompleteFinishAlertOpen] = useState(false);
  const congratsShownRef = useRef(false);

  // Helper: Check if all sets for a specific exercise are completed
  const isExerciseComplete = (exerciseId: string): boolean => {
    const exerciseSets = sets[exerciseId] || [];
    if (exerciseSets.length === 0) return false;
    return exerciseSets.every((set) => set.completed);
  };

  // Helper: Check if ALL exercises are complete
  const isWorkoutComplete = (): boolean => {
    if (activeExercises.length === 0) return false;
    return activeExercises.every((ex) => isExerciseComplete(ex.id));
  };

  // Effect: Show congratulations when all exercises are complete
  useEffect(() => {
    if (isWorkoutComplete() && !congratsShownRef.current) {
      congratsShownRef.current = true;
      setCongratsModalOpen(true);
      haptic.success();
    }
    // Reset if user unchecks something
    if (!isWorkoutComplete()) {
      congratsShownRef.current = false;
    }
  }, [sets, activeExercises]);

  const handleLoadLastRoutineRun = async () => {
    // Check if there is any data entered
    const hasData = Object.values(sets).some((exSets) =>
      exSets.some(
        (s) =>
          (s.weight !== "" && s.weight !== undefined) ||
          (s.reps !== "" && s.reps !== undefined) ||
          (s.duration !== "" && s.duration !== undefined) ||
          (s.distance !== "" && s.distance !== undefined) ||
          (s.calories !== "" && s.calories !== undefined)
      )
    );

    if (hasData) {
      setLoadLastRunAlertOpen(true);
    } else {
      await executeLoadLastRoutineRun();
    }
  };

  const handleApplyDoubleProgression = async (
    targetExerciseId?: string,
    forceSkipInvalid = false
  ) => {
    try {
      // Determine scope: all exercises or specific one
      // Helper to avoid event object being passed as string if called from onClick without arrow func
      const actualTargetId = typeof targetExerciseId === "string" ? targetExerciseId : undefined;

      // Filter: Only include NON-AD-HOC exercises and active ones
      let exercisesToProcess = activeExercises.filter((ex) => {
        // If specific ID requested, match it
        if (actualTargetId && ex.id !== actualTargetId) return false;
        // Check if part of original routine
        const isAdHoc = !routineExerciseIds.includes(ex.id);
        if (isAdHoc) return false;
        return true;
      });

      if (exercisesToProcess.length === 0) {
        if (actualTargetId) {
          // If user clicked overloading on an ad-hoc exercise explicitly (should be hidden in UI though)
          toast.info("This exercise is not part of the original routine.");
        }
        return;
      }

      // 1. Validate: Check which exercises have targets
      const exercisesWithoutTargets = exercisesToProcess.filter(
        (ex) => !ex.targetReps && !ex.targetSets
      );

      if (exercisesWithoutTargets.length > 0) {
        if (forceSkipInvalid) {
          // Filter them out and proceed
          exercisesToProcess = exercisesToProcess.filter(
            (ex) => !!ex.targetReps || !!ex.targetSets
          );
          if (exercisesToProcess.length === 0) {
            toast.info("No valid exercises to overload.");
            return;
          }
        } else {
          setMissingTargetsExercises(exercisesWithoutTargets);
          setMissingTargetsAlertOpen(true);
          // We pause here. The dialog will allow user to "skip invalid" which calls this function recursively or a dedicated handler.
          return;
        }
      }

      // 2. Fetch last run data
      const res = await fetch(`/api/workout-logs/${logId}/last-routine-run`);
      const result = await res.json();

      let lastRunSets = result.found ? result.data.sets : {};

      // FALLBACK: If single exercise mode and no routine history (or ex missing), try exercise specific history
      if (actualTargetId) {
        const hasRoutineHistory =
          result.found && lastRunSets[actualTargetId] && lastRunSets[actualTargetId].length > 0;

        if (!hasRoutineHistory) {
          try {
            const historyRes = await fetch(
              `/api/exercises/last-sets?exerciseId=${actualTargetId}&excludeLogId=${logId}`
            );
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              if (historyData && historyData.sets && historyData.sets.length > 0) {
                lastRunSets = { [actualTargetId]: historyData.sets };
                // toast.info("Using data from a previous routine run."); // Optional feedback
              } else {
                toast.info(
                  "Finish your first workout with this exercise to enable progressive overload."
                );
                return;
              }
            } else {
              toast.info(
                "Finish your first workout with this exercise to enable progressive overload."
              );
              return;
            }
          } catch (err) {
            console.error("Fallback fetch failed", err);
          }
        }
      } else if (!result.found) {
        toast.info("Finish this routine at least once to enable progressive overload.");
        return;
      }

      const newSets = { ...sets };
      let appliedCount = 0; // Tracks any application (success or failure-reset)
      let failureReason = "";
      const diffs: ProgressionDifference[] = [];

      exercisesToProcess.forEach((ex) => {
        const lastSets = lastRunSets[ex.id];

        const result = applyProgressiveOverload(
          {
            id: ex.id,
            name: ex.name,
            type: ex.type,
            targetReps: ex.targetReps,
            targetSets: ex.targetSets,
            incrementValue: ex.incrementValue
          },
          lastSets || []
        );

        if (result.applied) {
          newSets[ex.id] = result.newSets;
          appliedCount++;
          if (result.diff) {
            diffs.push(result.diff);
          }
        } else if (exercisesToProcess.length === 1 && result.failureReason) {
          failureReason = result.failureReason;
        }
      });

      if (appliedCount > 0) {
        setSets(newSets);
        setProgressionDiffs(diffs);

        toast.success("Applied Progressive Overload", {
          action: {
            label: "See details",
            onClick: () => setSummaryModalOpen(true)
          }
        });
      } else {
        if (exercisesToProcess.length === 1 && failureReason) {
          toast.info(`Progression not applied: ${failureReason}`);
        } else {
          toast.info("No exercises qualified for weight increase yet. Keep pushing!");
        }
      }
    } catch (e) {
      console.error("Failed to apply double progression", e);
      toast.error("Failed to calculate progression");
    }
  };

  const executeLoadLastRoutineRun = async () => {
    setLoadLastRunAlertOpen(false);
    try {
      const res = await fetch(`/api/workout-logs/${logId}/last-routine-run`);
      const result = await res.json();

      if (!result.found) {
        toast.info("No previous run found for this routine");
        return;
      }

      const { data } = result;

      // Merge or replace? User asked to "load last values".
      // Map sets to reset completed status
      const cleanSets: Record<string, WorkoutSet[]> = {};
      if (data.sets) {
        Object.entries(data.sets).forEach(([exId, setList]) => {
          if (Array.isArray(setList)) {
            cleanSets[exId] = setList.map((s: any) => ({
              ...s,
              completed: false
            }));
          }
        });
      }

      setSets((prev) => ({ ...prev, ...cleanSets }));
      setSessionNotes((prev) => ({ ...prev, ...data.sessionNotes }));
      setSupersetStatus((prev) => ({ ...prev, ...data.supersetStatus }));

      toast.success(`Loaded data from ${new Date(data.finishedAt).toLocaleDateString()}`);
    } catch (e) {
      console.error("Failed to load last routine run", e);
      toast.error("Failed to load previous data");
    }
  };

  const [infoAlert, setInfoAlert] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: ""
  });
  const [supersetStatus, setSupersetStatus] =
    useState<Record<string, boolean>>(initialSupersetStatus);

  // State refs for auto-save on unmount
  const stateRef = useRef({ sets, activeExercises, supersetStatus, sessionNotes });
  const isFinishingRef = useRef(false);

  useEffect(() => {
    stateRef.current = { sets, activeExercises, supersetStatus, sessionNotes };
  }, [sets, activeExercises, supersetStatus, sessionNotes]);

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      if (isFinishingRef.current) return;

      const { sets, activeExercises, supersetStatus, sessionNotes } = stateRef.current;

      // Replicate logic from sanitizeSets but inside cleanup
      const completeSets: Record<string, WorkoutSet[]> = {};

      activeExercises.forEach((ex) => {
        if (sets[ex.id]) {
          completeSets[ex.id] = sets[ex.id];
        } else {
          // Recreate empty set logic manually or extract helper.
          if (ex.type === "CARDIO") {
            completeSets[ex.id] = [
              { duration: "", distance: "", calories: "", completed: false, type: "NORMAL" }
            ];
          } else {
            completeSets[ex.id] = [{ weight: "", reps: "", completed: false, type: "NORMAL" }];
          }
        }
      });

      // Beacon/Keepalive fetch
      fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: completeSets,
          supersetStatus,
          sessionNotes
          // No finishedAt for auto-save
        }),
        headers: { "Content-Type": "application/json" },
        keepalive: true
      }).catch((e) => console.error("Auto-save failed", e));
    };
  }, [logId]); // Dependencies should be stable, logId unlikely to change.

  // Fetch existing log data on mount (resume support)
  useEffect(() => {
    const loadedNotes: Record<string, string> = {};

    // Initialize sets and notes from log/props
    // NOTE: parent (workout.astro) should have passed exercises with data if it's a resume
    // We'll trust initialExercises to have what we need if mapped correctly,
    // OR we rely on parent to pass `exercises` that are from log entries.
    // Parent logic: "entries.map(e => e.exercise)". This loses the `WorkoutLogEntry` data (sets, notes).
    // I need to fix parent to pass sets/notes separate or enriched.
    // For now assuming parent will be fixed to pass `ActiveWorkoutExercise` which has sessionNote.

    initialExercises.forEach((ex) => {
      if (ex.sessionNote) {
        loadedNotes[ex.id] = ex.sessionNote;
      }
    });
    setSessionNotes(loadedNotes);

    const loadLog = async () => {
      try {
        const res = await fetch(`/api/workout-logs/${logId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.entries && data.entries.length > 0) {
            const loadedSets: Record<string, WorkoutSet[]> = {};
            const loadedSupersets: Record<string, boolean> = {};
            data.entries.forEach((e: any) => {
              loadedSets[e.exerciseId] = e.sets;
              if (e.isSuperset) loadedSupersets[e.exerciseId] = true;
            });
            setSets(loadedSets);
            setSupersetStatus(loadedSupersets);
          }
        }
      } catch (e) {
        console.error("Failed to load existing log", e);
      }
    };
    if (logId) {
      loadLog();
    }
  }, [logId]);

  // Carousel scroll effects removed

  // const currentExercise = activeExercises[current] || activeExercises[0]; // Removed

  const createEmptySet = (type: ExerciseType = "WEIGHT"): WorkoutSet => {
    if (type === "CARDIO") {
      return { duration: "", distance: "", calories: "", completed: false, type: "NORMAL" };
    }
    return { weight: "", reps: "", completed: false, type: "NORMAL" };
  };

  const updateSet = (exerciseId: string, idx: number, field: keyof WorkoutSet, value: any) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type)];
    const newSets = [...currentExSets];
    newSets[idx] = { ...newSets[idx], [field]: value };
    setSets({ ...sets, [exerciseId]: newSets });
  };

  const verifyInput = (exerciseId: string, idx: number, val: number, field: "weight" | "reps") => {
    const currentSets = sets[exerciseId];
    if (!currentSets) return;

    // Helper to set warning
    const warn = (msg: string) => {
      setInputWarnings((prev) => ({ ...prev, [`${exerciseId}-${idx}-${field}`]: msg }));
    };

    // Check Previous Set
    if (idx > 0) {
      const prevSet = currentSets[idx - 1];
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
    if (idx < currentSets.length - 1) {
      const nextSet = currentSets[idx + 1];
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

  const addSet = (exerciseId: string) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type)];
    const lastSet = currentExSets[currentExSets.length - 1];
    setSets({
      ...sets,
      [exerciseId]: [...currentExSets, { ...lastSet, completed: false, type: "NORMAL" }]
    });
  };

  const removeSet = (exerciseId: string, idx: number) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type)];
    if (currentExSets.length <= 1) return;

    const newSets = currentExSets.filter((_, i) => i !== idx);
    setSets({ ...sets, [exerciseId]: newSets });
  };

  // goToNext removed

  /* handleCancel removed as unused */

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === activeExercises.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newExercises = [...activeExercises];

    // Swap
    [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];

    lastMovedIndexRef.current = newIndex;
    setActiveExercises(newExercises);

    // Immediate save order
    fetch(`/api/workout-logs/${logId}/reorder`, {
      method: "POST",
      body: JSON.stringify({ exerciseIds: newExercises.map((e) => e.id) }),
      headers: { "Content-Type": "application/json" }
    }).catch((e) => console.error("Reorder failed", e));
  };

  useEffect(() => {
    if (lastMovedIndexRef.current !== null) {
      const element = itemsRef.current.get(lastMovedIndexRef.current);
      if (element) {
        element.scrollIntoView({ block: "center" });
      }
      lastMovedIndexRef.current = null;
    }
  }, [activeExercises]);

  const openAddExercise = () => {
    setPickerMode("add");
    setPickerOpen(true);
  };

  const openReplaceExercise = (index: number) => {
    setTargetExerciseIndex(index);
    setPickerMode("replace");
    setPickerOpen(true);
  };

  const handleExerciseSelect = async (exercise: Exercise) => {
    if (!exercise) return;

    if (activeExercises.some((e) => e.id === exercise.id)) {
      toast.info(`"${exercise.name}" is already in the workout.`);
      setPickerOpen(false);
      return;
    }

    if (pickerMode === "add") {
      setActiveExercises((prev) => [...prev, exercise]);
    } else {
      const newExercises = [...activeExercises];
      if (targetExerciseIndex >= 0 && targetExerciseIndex < newExercises.length) {
        const oldExId = newExercises[targetExerciseIndex].id;
        newExercises[targetExerciseIndex] = exercise;
        setActiveExercises(newExercises);

        // Reset sets for this slot
        const { [oldExId]: _removed, ...restSets } = sets;
        setSets({ ...restSets, [exercise.id]: [createEmptySet(exercise.type)] });
      }
    }
    setPickerOpen(false);
    setTargetExerciseIndex(-1);
  };

  const handleAddCardio = async (term: string) => {
    setCardioModalOpen(false);
    try {
      // Find generic cardio or specific term (Running, Walking, etc)
      // Note: These must be seeded or created on command if we want specific types
      // Use uppercase CARDIO to match seed
      const res = await fetch(
        `/api/exercises?search=${encodeURIComponent(term)}&category=CARDIO&limit=1`
      );

      let found: Exercise | null = null;
      if (res.ok) {
        const data = await res.json();
        // Adjust based on API structure
        found = data.exercises?.[0] || data.data?.[0];
      }

      if (found) {
        // Enforce CARDIO type to ensure UI renders correctly
        handleExerciseSelect({ ...found, type: "CARDIO" });
        return;
      }

      // If not found, we could prompt to create it, or fallback.
      // For now, let's just create it on the fly if backend supports it?
      // Or just open picker.
      // The user requested seeding, so we assume they will exist.
      setInfoAlert({
        open: true,
        title: "Exercise Not Found",
        message: `Could not find "${term}". Please ensure database is seeded.`
      });
      setPickerMode("add");
      setPickerOpen(true);
    } catch (e) {
      console.error("Failed to quick add cardio", e);
      setPickerMode("add");
      setPickerOpen(true);
    }
  };

  const handleDeleteClick = (index: number) => {
    setTargetExerciseIndex(index);
    setDeleteAlertOpen(true);
  };

  const confirmDeleteExercise = async () => {
    setDeleteAlertOpen(false);
    if (targetExerciseIndex < 0) return;

    const exerciseToDelete = activeExercises[targetExerciseIndex];
    if (!exerciseToDelete) return;

    const newExercises = activeExercises.filter((_, i) => i !== targetExerciseIndex);
    setActiveExercises(newExercises);

    const { [exerciseToDelete.id]: _removed, ...restSets } = sets;
    setSets(restSets);

    await fetch(`/api/workout-logs/${logId}`, {
      method: "PUT",
      body: JSON.stringify({ entries: restSets, supersetStatus }),
      headers: { "Content-Type": "application/json" }
    });

    setTargetExerciseIndex(-1);
  };

  const handleCancelWorkout = async () => {
    setCancelAlertOpen(false);
    isFinishingRef.current = true; // Prevent auto-save
    try {
      const res = await fetch(`/api/workout-logs/${logId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("Workout cancelled");
        navigate("/");
      } else {
        throw new Error("Failed to cancel");
      }
    } catch (error) {
      console.error("Failed to cancel workout", error);
      toast.error("Failed to cancel workout");
      isFinishingRef.current = false; // Restore
    }
  };

  const handleReset = async () => {
    setResetAlertOpen(false);
    try {
      const res = await fetch(`/api/workout-logs/${logId}/reset`, {
        method: "POST"
      });

      if (!res.ok) throw new Error("Reset failed");

      const data = await res.json();

      // Update all state with fresh data from backend
      setActiveExercises(data.exercises);
      setSupersetStatus(data.supersetStatus);
      setSets(data.sets);
      setSessionNotes({});
      setTargetExerciseIndex(-1); // Reset any active highlighting

      toast.success("Workout reset to routine");
    } catch (error) {
      console.error("Failed to reset workout", error);
      toast.error("Failed to reset workout");
    }
  };

  const handleFinishWorkout = async () => {
    setCongratsModalOpen(false);
    setIncompleteFinishAlertOpen(false);
    isFinishingRef.current = true;

    try {
      // Save final state with finishedAt timestamp
      const res = await fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: stateRef.current.sets,
          supersetStatus: stateRef.current.supersetStatus,
          notes: stateRef.current.sessionNotes,
          finishedAt: new Date().toISOString()
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        haptic.success();
        toast.success("Workout completed!");
        navigate(`/history/${logId}`);
      } else {
        throw new Error("Failed to finish");
      }
    } catch (error) {
      console.error("Failed to finish workout", error);
      toast.error("Failed to finish workout");
      isFinishingRef.current = false;
    }
  };

  // Handler for finish button click
  const handleFinishButtonClick = () => {
    if (isWorkoutComplete()) {
      // All sets completed - finish immediately
      handleFinishWorkout();
    } else {
      // Not all sets completed - show confirmation
      setIncompleteFinishAlertOpen(true);
    }
  };

  const loadLastRun = async (exerciseId: string) => {
    try {
      const res = await fetch(
        `/api/exercises/last-sets?exerciseId=${exerciseId}&excludeLogId=${logId}`
      );
      const data = await res.json();

      if (!data.found) {
        toast.info("No previous data found for this exercise");
        return;
      }

      // Apply the loaded sets with reset status
      const cleanSets = Array.isArray(data.sets)
        ? data.sets.map((s: any) => ({ ...s, completed: false }))
        : [];

      setSets((prev) => ({
        ...prev,
        [exerciseId]: cleanSets
      }));

      // Apply the session note if exists
      if (data.note) {
        setSessionNotes((prev) => ({
          ...prev,
          [exerciseId]: data.note
        }));
      }

      toast.success(`Loaded data from ${new Date(data.finishedAt).toLocaleDateString()}`);
    } catch (e) {
      console.error("Failed to load last run:", e);
      toast.error("Failed to load previous data");
    }
  };

  // Auto-save Effect (Improved Debounce with Race Condition Prevention)
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = async () => {
    // If already saving, mark that we need another save after
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    if (isFinishingRef.current) return;

    isSavingRef.current = true;
    pendingSaveRef.current = false;

    // Use stateRef to get the LATEST state at save time
    const { sets, activeExercises, supersetStatus, sessionNotes } = stateRef.current;

    const completeSets: Record<string, WorkoutSet[]> = {};
    activeExercises.forEach((ex) => {
      if (sets[ex.id]) {
        completeSets[ex.id] = sets[ex.id];
      } else {
        if (ex.type === "CARDIO") {
          completeSets[ex.id] = [
            { duration: "", distance: "", calories: "", completed: false, type: "NORMAL" }
          ];
        } else {
          completeSets[ex.id] = [{ weight: "", reps: "", completed: false, type: "NORMAL" }];
        }
      }
    });

    try {
      await fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: completeSets,
          supersetStatus,
          sessionNotes,
          exerciseOrder: activeExercises.map((e) => e.id)
        }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    } finally {
      isSavingRef.current = false;

      // If there was a pending save request, do it now
      if (pendingSaveRef.current) {
        performSave();
      }
    }
  };

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, 1500); // 1.5 seconds debounce for quicker feedback

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sets, supersetStatus, sessionNotes, activeExercises]); // Dependencies for auto-save

  const startTimeDisplay = new Date(initialStartTime).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6 pb-12">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between lg:px-0">
        <div className="flex max-w-[85%] flex-wrap items-center gap-2">
          <div className="text-muted-foreground bg-muted/50 flex flex-wrap items-center gap-x-2 rounded-full border px-3 py-1 text-sm leading-tight font-medium">
            <span className="text-foreground font-semibold">{routineName}</span>
            <span>Started at {startTimeDisplay}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Workout options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setReorderMode(!reorderMode)}>
              {reorderMode ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="mr-2 h-4 w-4" />
              )}
              {reorderMode ? "Done reordering" : "Reorder exercises"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLoadLastRoutineRun()}>
              <History className="mr-2 h-4 w-4" />
              Load last run
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setResetAlertOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to routine
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setCancelAlertOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Cancel workout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Double Progression Button - Full Width */}
      <Button
        variant="accent"
        size="lg"
        onClick={() => handleApplyDoubleProgression()}
        className="w-full shadow-md transition-all"
      >
        <TrendingUp className="mr-2 h-5 w-5" />
        Apply progressive overload
      </Button>

      <div className="text-muted-foreground bg-muted/30 flex items-center justify-center rounded-lg border border-dashed p-2 text-center text-xs">
        Tap set number to toggle between set types
      </div>

      {/* Main Content - Scroll List */}
      <div className="flex flex-col gap-6">
        {activeExercises.map((ex, index) => (
          <motion.div
            key={ex.id}
            ref={(el) => {
              if (el) itemsRef.current.set(index, el);
              else itemsRef.current.delete(index);
            }}
            initial={false}
            animate={{
              opacity: isExerciseComplete(ex.id) ? 0.6 : 1,
              scale: isExerciseComplete(ex.id) ? 0.95 : 1
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="carousel-visual-content bg-card relative overflow-hidden rounded-xl border shadow-sm will-change-transform"
          >
            {reorderMode && (
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 opacity-90 shadow-sm hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveExercise(index, "up");
                  }}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 opacity-90 shadow-sm hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveExercise(index, "down");
                  }}
                  disabled={index === activeExercises.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            {ex.imageUrl && (
              <div className="bg-muted h-48 w-full shrink-0">
                <img
                  src={ex.imageUrl}
                  alt={ex.name}
                  onClick={() => {}}
                  className="h-full w-full bg-white object-contain"
                />
              </div>
            )}

            <div className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="flex items-center gap-2 text-lg leading-none font-bold capitalize">
                    {ex.name}
                    <ExerciseInfoModal exercise={ex} />
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs capitalize">
                      {ex.bodyPart}
                    </span>
                    {ex.target && (
                      <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs capitalize">
                        {ex.target}
                      </span>
                    )}
                  </div>

                  {/* Targets Display */}
                  <TargetDisplay
                    targetSets={ex.targetSets}
                    targetReps={ex.targetReps}
                    targetType={ex.targetType}
                    targetRepsToFailure={ex.targetRepsToFailure}
                    incrementValue={ex.incrementValue}
                    className="mt-1.5 w-fit"
                    asGrid
                  />

                  {/* Routine Note (Static, not editable) */}
                  {ex.routineNote && (
                    <div className="text-muted-foreground bg-muted/20 mt-2 w-fit rounded-r border-l-4 py-1 pr-2 pl-3 text-sm whitespace-pre-wrap">
                      {ex.routineNote}
                    </div>
                  )}

                  {/* Session Note Display (Text Only) */}
                  {/* Session Note UI - Replaces old display and button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="mt-2 w-fit cursor-pointer text-sm transition-opacity hover:opacity-80">
                        {sessionNotes[ex.id] ? (
                          <div className="text-foreground/80 bg-background flex w-fit items-start gap-2 rounded-md border px-2 py-1.5">
                            <MessageSquareText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                            <span className="leading-snug whitespace-pre-wrap">
                              {sessionNotes[ex.id]}
                            </span>
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
                        <DialogTitle>Session note for {ex.name}</DialogTitle>
                      </DialogHeader>
                      <div className="py-2">
                        <Textarea
                          placeholder="How did it feel? e.g. Heavy, easy, pain in shoulder..."
                          value={sessionNotes[ex.id] || ""}
                          onChange={(e) =>
                            setSessionNotes((prev) => ({ ...prev, [ex.id]: e.target.value }))
                          }
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
                  {/* Actions Menu */}
                  <div className="flex items-center gap-1">
                    {supersetStatus[ex.id] && (
                      <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => loadLastRun(ex.id)}>
                          <History className="mr-2 h-4 w-4" />
                          Load last run
                        </DropdownMenuItem>
                        {routineExerciseIds.includes(ex.id) && (
                          <DropdownMenuItem onClick={() => handleApplyDoubleProgression(ex.id)}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Apply overload
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setSupersetStatus((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }));
                          }}
                        >
                          <Zap
                            className={`mr-2 h-4 w-4 ${supersetStatus[ex.id] ? "fill-amber-500 text-amber-500" : ""}`}
                          />
                          <span className={supersetStatus[ex.id] ? "font-bold text-amber-500" : ""}>
                            {supersetStatus[ex.id] ? "Active superset" : "Toggle superset"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReplaceExercise(index)}>
                          <ArrowLeftRight className="mr-2 h-4 w-4" />
                          Replace exercise
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove exercise
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {ex.type === "CARDIO" ? (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 text-sm font-medium">
                  <div className="w-6 text-center">#</div>
                  <div className="text-center">Minutes</div>
                  <div className="text-center">Km</div>
                  <div className="text-center">Calories</div>
                  <div className="w-8"></div>
                </div>
              ) : (
                <div className="text-muted-foreground grid grid-cols-[auto_auto_1fr_1fr_auto] gap-4 text-sm font-medium">
                  <div className="w-6"></div> {/* Tick column */}
                  <div className="w-8 text-center">#</div>
                  <div className="text-center">Kg</div>
                  <div className="text-center">
                    {ex.targetType === "DURATION" ? "Secs" : "Reps"}
                  </div>
                  <div className="w-8"></div>
                </div>
              )}

              {(sets[ex.id] || [createEmptySet(ex.type)]).map((set, idx) => (
                <div
                  key={idx}
                  className={`relative grid items-center gap-4 ${
                    ex.type === "CARDIO"
                      ? "grid-cols-[auto_1fr_1fr_1fr_auto]"
                      : "grid-cols-[auto_auto_1fr_1fr_auto]"
                  } ${set.completed ? "opacity-50" : ""}`}
                >
                  {/* Strikethrough Line */}
                  {set.completed && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 30 }}
                      className="bg-foreground/30 pointer-events-none absolute top-1/2 right-10 left-0 z-10 h-0.5 origin-left"
                    />
                  )}

                  {/* Tick/Complete Toggle - New Column */}
                  {ex.type !== "CARDIO" && (
                    <div
                      className="flex cursor-pointer items-center justify-center"
                      onClick={() => {
                        const newCompleted = !set.completed;
                        if (newCompleted) haptic.success();
                        else haptic.impactLight();
                        updateSet(ex.id, idx, "completed", newCompleted);
                      }}
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${set.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-muted-foreground/50"}`}
                      >
                        {set.completed && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  )}

                  <SetTypeSelector
                    setNumber={idx + 1}
                    type={set.type}
                    onChange={(newType) => updateSet(ex.id, idx, "type", newType)}
                  />
                  {ex.type === "CARDIO" ? (
                    <>
                      <Input
                        type="number"
                        value={set.duration === "" ? "" : set.duration}
                        onChange={(e) =>
                          updateSet(
                            ex.id,
                            idx,
                            "duration",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="px-1 text-center"
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        value={set.distance === "" ? "" : set.distance}
                        onChange={(e) =>
                          updateSet(
                            ex.id,
                            idx,
                            "distance",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="px-1 text-center"
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        value={set.calories === "" ? "" : set.calories}
                        onChange={(e) =>
                          updateSet(
                            ex.id,
                            idx,
                            "calories",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
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
                          value={set.weight === "" ? "" : set.weight}
                          onChange={(e) => {
                            if (inputWarnings[`${ex.id}-${idx}-weight`]) {
                              const newWarnings = { ...inputWarnings };
                              delete newWarnings[`${ex.id}-${idx}-weight`];
                              setInputWarnings(newWarnings);
                            }
                            updateSet(
                              ex.id,
                              idx,
                              "weight",
                              e.target.value === "" ? "" : Number(e.target.value)
                            );
                          }}
                          onBlur={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            if (val > 0) verifyInput(ex.id, idx, val, "weight");
                          }}
                          className={cn(
                            "text-center transition-colors",
                            inputWarnings[`${ex.id}-${idx}-weight`] &&
                              "border-amber-500 focus-visible:ring-amber-500"
                          )}
                          placeholder="0"
                        />
                        {inputWarnings[`${ex.id}-${idx}-weight`] && (
                          <InputWarning message={inputWarnings[`${ex.id}-${idx}-weight`]} />
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={set.reps === "" ? "" : set.reps}
                          onChange={(e) => {
                            if (inputWarnings[`${ex.id}-${idx}-reps`]) {
                              const newWarnings = { ...inputWarnings };
                              delete newWarnings[`${ex.id}-${idx}-reps`];
                              setInputWarnings(newWarnings);
                            }
                            updateSet(
                              ex.id,
                              idx,
                              "reps",
                              e.target.value === "" ? "" : Number(e.target.value)
                            );
                          }}
                          onBlur={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            if (val > 0) verifyInput(ex.id, idx, val, "reps");
                          }}
                          className={cn(
                            "text-center transition-colors",
                            inputWarnings[`${ex.id}-${idx}-reps`] &&
                              "border-amber-500 focus-visible:ring-amber-500"
                          )}
                          placeholder="0"
                        />
                        {inputWarnings[`${ex.id}-${idx}-reps`] && (
                          <InputWarning message={inputWarnings[`${ex.id}-${idx}-reps`]} />
                        )}
                      </div>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => removeSet(ex.id, idx)}
                    disabled={(sets[ex.id] || []).length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" className="w-full" onClick={() => addSet(ex.id)}>
                + Add set
              </Button>
            </div>
          </motion.div>
        ))}

        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed py-8">
          <Button size="lg" className="h-12 w-48 gap-2 text-base" onClick={openAddExercise}>
            <Plus className="h-5 w-5" />
            Add exercise
          </Button>

          <Dialog open={cardioModalOpen} onOpenChange={setCardioModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="h-12 w-48 gap-2 text-base">
                <Activity className="h-5 w-5" />
                Add cardio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Choose cardio type</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                {CARDIO_OPTIONS.map((option) => (
                  <Button
                    key={option.name}
                    variant="outline"
                    className="hover:bg-muted/50 hover:border-primary/50 flex h-24 flex-col gap-2 transition-all"
                    onClick={() => handleAddCardio(option.name)}
                  >
                    <option.icon className="h-8 w-8 opacity-70" />
                    <span className="font-semibold">{option.name}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Finish Workout Button - In page flow */}
      <div className="flex w-full">
        <Button size="lg" className="flex-1" onClick={handleFinishButtonClick}>
          Finish workout
        </Button>
      </div>

      <ExerciseSelector
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleExerciseSelect}
        selectedExerciseIds={activeExercises.map((e) => e.id)}
        routineExercises={routineExercisesList} // Pass the full routine list including inactive
        preferredCategories={
          Array.from(new Set(activeExercises.map((e) => e.category).filter(Boolean))) as string[]
        }
        trigger={<div className="hidden" />}
      />

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="text-foreground font-semibold">
                {targetExerciseIndex >= 0 && activeExercises[targetExerciseIndex]?.name}
              </span>{" "}
              and all its sets from your current workout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteExercise}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={loadLastRunAlertOpen} onOpenChange={setLoadLastRunAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite current data?</AlertDialogTitle>
            <AlertDialogDescription>
              You have already entered some data. Loading the last run will overwrite existing
              values for matching exercises.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeLoadLastRoutineRun}>
              Continue & overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetAlertOpen} onOpenChange={setResetAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all exercises and sets back to the original routine. Any changes
              you've made (added exercises, modified sets, notes) will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={missingTargetsAlertOpen} onOpenChange={setMissingTargetsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Missing targets</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 text-start">
                <span>
                  The following exercises need targets (sets/reps) to enable progressive overload:
                </span>
                <ul className="text-foreground/90 my-2 list-disc space-y-1 pl-5 text-sm font-medium">
                  {missingTargetsExercises.map((e) => (
                    <li key={e.id} className="capitalize">
                      {e.name}
                    </li>
                  ))}
                </ul>
                <span>
                  You can skip these and apply overload to the rest, or go to settings to fix them.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setMissingTargetsAlertOpen(false);
                handleApplyDoubleProgression(undefined, true);
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Skip & apply to others
            </AlertDialogAction>
            <AlertDialogAction onClick={() => navigate(`/routines/${routineGroupId}/${routineId}`)}>
              Go to settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Progression summary</AlertDialogTitle>
            <AlertDialogDescription>
              Here's how your targets have changed based on your last performance:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            {progressionDiffs.map((diff, i) => (
              <div key={i} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-semibold capitalize">{diff.exerciseName}</span>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  {diff.type === "PROMOTION" ? (
                    <>
                      <div className="decoration-destructive/50 flex items-center gap-1 line-through">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" />
                          {diff.oldWeight}kg
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {diff.oldReps} reps
                        </span>
                      </div>
                      <ArrowRight className="h-3 w-3" />
                      <div className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {diff.newWeight}kg
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {diff.newReps} reps
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-muted-foreground text-xs">
                        Target set to min range. Hit min reps to progress:
                      </span>
                      <div className="text-foreground flex items-center gap-2 font-medium">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {diff.newWeight}kg
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {diff.newReps} reps
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSummaryModalOpen(false)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelAlertOpen} onOpenChange={setCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this workout? This will discard all progress and
              delete the log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelWorkout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={infoAlert.open}
        onOpenChange={(open) => setInfoAlert((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{infoAlert.title}</AlertDialogTitle>
            <AlertDialogDescription>{infoAlert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setInfoAlert((prev) => ({ ...prev, open: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Fixed Done Reordering Button */}
      {reorderMode && (
        <Button
          size="icon"
          className="bg-primary text-primary-foreground animate-in zoom-in spin-in-12 fixed right-6 bottom-18 z-50 h-14 w-14 rounded-full shadow-lg duration-300 md:bottom-6"
          onClick={() => setReorderMode(false)}
        >
          <Check className="h-6 w-6" />
        </Button>
      )}

      {/* Congratulations Modal - When all exercises complete */}
      <AlertDialog open={congratsModalOpen} onOpenChange={setCongratsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PartyPopper />
              Congratulations!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              You've completed all your sets! Great workout! Ready to finish?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Keep training</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishWorkout}>Finish workout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Incomplete Workout Confirmation */}
      <AlertDialog open={incompleteFinishAlertOpen} onOpenChange={setIncompleteFinishAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish workout?</AlertDialogTitle>
            <AlertDialogDescription>
              You haven't completed all your sets yet. Are you sure you want to finish this workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep training</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishWorkout}>Finish anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
