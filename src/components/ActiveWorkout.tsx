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
import type { SetType } from "@/types/set-types";
import { navigate } from "astro:transitions/client";
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Bike,
  Check,
  Dumbbell,
  Footprints,
  History,
  MessageSquareText,
  MoreVertical,
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

  // Double Progression Summary State
  const [progressionDiffs, setProgressionDiffs] = useState<ProgressionDifference[]>([]);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

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
        if (!ex.targetReps) return;

        const targetParts = ex.targetReps.split("-").map((s) => parseInt(s.trim()));
        const maxReps = targetParts.length > 1 ? targetParts[1] : targetParts[0];
        const minReps = targetParts[0];

        const lastSets = lastRunSets[ex.id];
        if (!lastSets || lastSets.length === 0) {
          if (exercisesToProcess.length === 1) failureReason = "No history found.";
          return;
        }

        const allSetsHitTarget = lastSets.every((s: any) => {
          if (s.type === "WARMUP") return true;
          return s.reps >= maxReps;
        });

        const lastWeight = lastSets[0].weight;

        if (allSetsHitTarget && lastWeight) {
          const increment = ex.incrementValue || 2.5;
          const nextWeight = Number(lastWeight) + increment;

          appliedCount++;

          newSets[ex.id] = lastSets.map(() => ({
            ...createEmptySet(ex.type),
            weight: nextWeight,
            reps: minReps
          }));

          // Logic Update: Fillsets if less than target
          if (ex.targetSets) {
            const targetSetCount = parseInt(ex.targetSets);
            if (!isNaN(targetSetCount) && newSets[ex.id].length < targetSetCount) {
              const diff = targetSetCount - newSets[ex.id].length;
              for (let k = 0; k < diff; k++) {
                newSets[ex.id].push({
                  ...createEmptySet(ex.type),
                  weight: nextWeight,
                  reps: minReps
                });
              }
            }
          }

          diffs.push({
            exerciseName: ex.name,
            oldWeight: Number(lastWeight),
            oldReps: maxReps, // They hit max reps
            newWeight: nextWeight,
            newReps: minReps,
            type: "PROMOTION"
          });

          // toast.success(`Promoted ${ex.name}: ${lastWeight}kg -> ${nextWeight}kg`);
        } else {
          // Failure reason tracking
          if (exercisesToProcess.length === 1) {
            if (!lastWeight) failureReason = "Last run had no weight recorded.";
            else failureReason = `Did not hit max reps (${maxReps}) on all sets last time.`;
          }

          if (lastWeight) {
            // Updated Failure Logic: Keep weight, set reps to MIN reps
            newSets[ex.id] = lastSets.map((s: any) => ({
              ...createEmptySet(ex.type),
              weight: s.weight,
              reps: minReps
            }));

            // Logic Update: Fillsets if less than target (Failure Case)
            if (ex.targetSets) {
              const targetSetCount = parseInt(ex.targetSets);
              if (!isNaN(targetSetCount) && newSets[ex.id].length < targetSetCount) {
                const diff = targetSetCount - newSets[ex.id].length;
                for (let k = 0; k < diff; k++) {
                  newSets[ex.id].push({
                    ...createEmptySet(ex.type),
                    weight: lastWeight, // Use last weight
                    reps: minReps
                  });
                }
              }
            }

            // Note: oldReps here is ambiguous (it varies per set).
            // We'll show the TARGET max reps as context, or maybe just "Min Range".
            // Let's use MIN reps as old reference for failure context, or better,
            // user wants "Old value under min range => +x reps"?
            // We just show Weight stays same.
            diffs.push({
              exerciseName: ex.name,
              oldWeight: Number(lastWeight),
              oldReps: minReps, // Resetting to min
              newWeight: Number(lastWeight),
              newReps: minReps,
              type: "RESET"
            });

            appliedCount++; // We applied the "reset" logic
          } else if (!newSets[ex.id] || newSets[ex.id][0].weight === "") {
            // ... existing fallback ...
            newSets[ex.id] = lastSets.map((s: any) => ({
              ...createEmptySet(ex.type),
              weight: s.weight,
              reps: ""
            }));
          }
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

  const validateAll = () => {
    return activeExercises.every((ex) => {
      const exSets = sets[ex.id] || [createEmptySet(ex.type)];
      return exSets.every((s) => {
        if (ex.type === "CARDIO") {
          // User request: Minutes and Calories are required
          return s.duration !== "" && s.calories !== "";
        } else {
          return s.weight !== "" && s.reps !== "";
        }
      });
    });
  };

  const isFormValid = validateAll();

  const sanitizeSets = () => {
    const completeSets: Record<string, WorkoutSet[]> = {};

    // Iterate activeExercises to preserve order in the object keys
    activeExercises.forEach((ex) => {
      if (sets[ex.id]) {
        completeSets[ex.id] = sets[ex.id];
      } else {
        completeSets[ex.id] = [createEmptySet(ex.type)];
      }
    });

    return completeSets;
  };

  const handleFinish = async () => {
    if (!isFormValid) return;
    isFinishingRef.current = true;
    const completeSets = sanitizeSets();

    toast.promise(
      fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: completeSets,
          supersetStatus,
          sessionNotes,
          finishedAt: new Date().toISOString()
        }),
        headers: { "Content-Type": "application/json" }
      }),
      {
        loading: "Saving workout...",
        success: () => {
          navigate("/");
          return "Workout saved!";
        },
        error: () => {
          isFinishingRef.current = false; // Reset if failed so user can try again or auto-save works later?
          // Actually if it failed, we are still on page.
          return "Failed to save workout.";
        }
      }
    );
  };

  /* handleCancel removed as unused */

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

  // Auto-save Effect (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't save if finishing (handled by handleFinish) or if component just mounted (initial state)
      // We can rely on isFinishingRef to avoid conflict
      if (isFinishingRef.current) return;

      const completeSets = sanitizeSets();

      // Silent save
      fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: completeSets,
          supersetStatus,
          sessionNotes
          // finishedAt is NOT sent, so status remains IN_PROGRESS
        }),
        headers: { "Content-Type": "application/json" }
      }).catch((e) => console.error("Auto-save failed", e));
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timer);
  }, [sets, supersetStatus, sessionNotes, activeExercises]); // Dependencies for auto-save

  const startTimeDisplay = new Date(initialStartTime).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="mx-auto flex max-w-md px-4 flex-col gap-6 py-6 pb-12">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between lg:px-0">
        <div className="flex flex-wrap items-center gap-2 max-w-[85%]">
          <div className="text-muted-foreground bg-muted/50 rounded-full border px-3 py-1 text-sm font-medium flex flex-wrap items-center gap-x-2 leading-tight">
            <span className="font-semibold text-foreground">{routineName}</span>
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
              Cancel Workout
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

      <div className="flex items-center justify-center text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed text-center">
        Tap set number to toggle between set types
      </div>

      {/* Main Content - Scroll List */}
      <div className="flex flex-col gap-6">
        {activeExercises.map((ex, index) => (
          <div
            key={`${ex.id}-${index}`}
            className="carousel-visual-content bg-card overflow-hidden rounded-xl shadow-sm transition-none will-change-transform border relative"
          >
            {ex.imageUrl && (
              <div className="bg-muted h-48 w-full shrink-0">
                <img
                  src={ex.imageUrl}
                  alt={ex.name}
                  onClick={() => {}}
                  className="h-full w-full object-contain bg-white"
                />
              </div>
            )}

            <div className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="flex items-center gap-2 text-lg font-bold capitalize leading-none">
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
                    targetRepsToFailure={ex.targetRepsToFailure}
                    incrementValue={ex.incrementValue}
                    className="mt-1.5 w-fit"
                    asGrid
                  />

                  {/* Routine Note (Static, not editable) */}
                  {ex.routineNote && (
                    <div className="mt-2 text-sm text-muted-foreground border-l-4 pl-3 py-1 pr-2 bg-muted/20 w-fit rounded-r">
                      {ex.routineNote}
                    </div>
                  )}

                  {/* Session Note Display (Text Only) */}
                  {/* Session Note UI - Replaces old display and button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="mt-2 text-sm cursor-pointer hover:opacity-80 transition-opacity w-fit">
                        {sessionNotes[ex.id] ? (
                          <div className="text-foreground/80 bg-background px-2 py-1.5 rounded-md flex items-start gap-2 border w-fit">
                            <MessageSquareText className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                            <span className="leading-snug">{sessionNotes[ex.id]}</span>
                          </div>
                        ) : (
                          <div className="border border-dashed border-muted-foreground/30 rounded-md p-1.5 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors w-fit">
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
                      <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
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
                            className={`mr-2 h-4 w-4 ${supersetStatus[ex.id] ? "text-amber-500 fill-amber-500" : ""}`}
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
                  <div className="text-center">Reps</div>
                  <div className="w-8"></div>
                </div>
              )}

              {(sets[ex.id] || [createEmptySet(ex.type)]).map((set, idx) => (
                <div
                  key={idx}
                  className={`grid gap-4 items-center relative ${
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
                      className="absolute left-0 right-10 top-1/2 h-0.5 bg-foreground/30 pointer-events-none z-10 origin-left"
                    />
                  )}

                  {/* Tick/Complete Toggle - New Column */}
                  {ex.type !== "CARDIO" && (
                    <div
                      className="flex items-center justify-center cursor-pointer"
                      onClick={() => {
                        const newCompleted = !set.completed;
                        if (newCompleted) haptic.success();
                        else haptic.impactLight();
                        updateSet(ex.id, idx, "completed", newCompleted);
                      }}
                    >
                      <div
                        className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${set.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-muted-foreground/50"}`}
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
                      <Input
                        type="number"
                        value={set.weight === "" ? "" : set.weight}
                        onChange={(e) =>
                          updateSet(
                            ex.id,
                            idx,
                            "weight",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="text-center"
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        value={set.reps === "" ? "" : set.reps}
                        onChange={(e) =>
                          updateSet(
                            ex.id,
                            idx,
                            "reps",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="text-center"
                        placeholder="0"
                      />
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
          </div>
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
        <Button size="lg" className="flex-1" onClick={handleFinish} disabled={!isFormValid}>
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
                <ul className="list-disc pl-5 space-y-1 font-medium text-foreground/90 my-2 text-sm">
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
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setMissingTargetsAlertOpen(false);
                handleApplyDoubleProgression(undefined, true);
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Skip & Apply to Others
            </AlertDialogAction>
            <AlertDialogAction onClick={() => navigate(`/routines/${routineGroupId}/${routineId}`)}>
              Go to Settings
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
          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto">
            {progressionDiffs.map((diff, i) => (
              <div key={i} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-sm capitalize">{diff.exerciseName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {diff.type === "PROMOTION" ? (
                    <>
                      <div className="flex items-center gap-1 line-through decoration-destructive/50">
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
                      <div className="flex items-center gap-2 font-medium text-foreground">
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
    </div>
  );
};
