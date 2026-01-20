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
import { navigate } from "astro:transitions/client";
import {
  Activity,
  ArrowLeftRight,
  Bike,
  Dumbbell,
  Footprints,
  History,
  MessageSquareText,
  MoreVertical,
  Plus,
  Repeat,
  RotateCcw,
  Target,
  Timer,
  Trash2,
  Waves,
  X,
  Zap
} from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const CARDIO_OPTIONS = [
  { name: "Running", icon: Footprints },
  { name: "Walking", icon: Activity },
  { name: "Cycling", icon: Bike },
  { name: "Swimming", icon: Waves },
  { name: "HIIT", icon: Timer },
  { name: "Other", icon: Dumbbell }
];

export const ExerciseType = {
  WEIGHT: "WEIGHT",
  CARDIO: "CARDIO"
} as const;
export type ExerciseType = (typeof ExerciseType)[keyof typeof ExerciseType];

export type SetType = "NORMAL" | "WARMUP" | "FAILURE";

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
}

export interface ActiveWorkoutProps {
  logId: string;
  initialStartTime: string;
  routineName: string;
  exercises: ActiveWorkoutExercise[]; // Updated type
  initialSupersetStatus?: Record<string, boolean>;
}

export const ActiveWorkout = ({
  logId,
  initialStartTime,
  exercises: initialExercises,
  initialSupersetStatus = {}
}: ActiveWorkoutProps) => {
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
  const [resetAlertOpen, setResetAlertOpen] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [infoAlert, setInfoAlert] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: ""
  });
  const [supersetStatus, setSupersetStatus] =
    useState<Record<string, boolean>>(initialSupersetStatus);

  // Scroll direction detection for footer visibility
  const [showFooter, setShowFooter] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Show footer when scrolling up, at top, or at bottom
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;

      if (currentScrollY < lastScrollY.current || currentScrollY < 50 || isAtBottom) {
        setShowFooter(true);
      } else {
        setShowFooter(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      const validExerciseIds = new Set(activeExercises.map((e) => e.id));

      Object.keys(sets).forEach((key) => {
        if (validExerciseIds.has(key)) {
          completeSets[key] = sets[key];
        }
      });

      activeExercises.forEach((ex) => {
        if (!completeSets[ex.id]) {
          // Recreate empty set logic manually or extract helper.
          // Since we can't easily call createEmptySet from here without making it static or moving it out,
          // we'll just skip adding empty sets if they don't exist in state or trust 'sets' state is mostly up to date.
          // Or better, define createEmptySet outside or trust `sets` deals with it.
          // For safety, let's just save what we have. API should handle it.
          if (ex.type === ExerciseType.CARDIO) {
            completeSets[ex.id] = [{ duration: "", distance: "", calories: "", completed: false }];
          } else {
            completeSets[ex.id] = [{ weight: "", reps: "", completed: false }];
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

  const createEmptySet = (type: ExerciseType = ExerciseType.WEIGHT): WorkoutSet => {
    if (type === ExerciseType.CARDIO) {
      return { duration: "", distance: "", calories: "", completed: false, type: "NORMAL" };
    }
    return { weight: "", reps: "", completed: false, type: "NORMAL" };
  };

  const updateSet = (exerciseId: string, idx: number, field: keyof WorkoutSet, value: any) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type as ExerciseType)];
    const newSets = [...currentExSets];
    newSets[idx] = { ...newSets[idx], [field]: value };
    setSets({ ...sets, [exerciseId]: newSets });
  };

  const toggleSetType = (exerciseId: string, idx: number) => {
    const currentSets = sets[exerciseId];
    if (!currentSets) return;

    const set = currentSets[idx];
    let nextType: SetType = "NORMAL";

    if (!set.type || set.type === "NORMAL") nextType = "WARMUP";
    else if (set.type === "WARMUP") nextType = "FAILURE";
    else nextType = "NORMAL";

    updateSet(exerciseId, idx, "type", nextType);
  };

  const addSet = (exerciseId: string) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type as ExerciseType)];
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

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type as ExerciseType)];
    if (currentExSets.length <= 1) return;

    const newSets = currentExSets.filter((_, i) => i !== idx);
    setSets({ ...sets, [exerciseId]: newSets });
  };

  // goToNext removed

  const validateAll = () => {
    return activeExercises.every((ex) => {
      const exSets = sets[ex.id] || [createEmptySet(ex.type as ExerciseType)];
      return exSets.every((s) => {
        if (ex.type === ExerciseType.CARDIO) {
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
    const validExerciseIds = new Set(activeExercises.map((e) => e.id));

    // Only include sets for currently active exercises
    Object.keys(sets).forEach((key) => {
      if (validExerciseIds.has(key)) {
        completeSets[key] = sets[key];
      }
    });

    // Ensure data exists for all active exercises
    activeExercises.forEach((ex) => {
      if (!completeSets[ex.id]) {
        completeSets[ex.id] = [createEmptySet(ex.type as ExerciseType)];
      }
    });
    return completeSets;
  };

  const handleSave = async () => {
    const completeSets = sanitizeSets();
    try {
      await fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: completeSets,
          supersetStatus,
          sessionNotes
          // No finishedAt for save
        }),
        headers: { "Content-Type": "application/json" }
      });

      setSaveSuccessOpen(true);
    } catch (e) {
      console.error("Save failed", e);
      setInfoAlert({
        open: true,
        title: "Save Failed",
        message: "There was an error saving your progress. Please try again."
      });
    }
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
        setSets({ ...restSets, [exercise.id]: [createEmptySet(exercise.type as ExerciseType)] });
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
        handleExerciseSelect({ ...found, type: ExerciseType.CARDIO });
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

  const handleReset = () => {
    setResetAlertOpen(false);
    // Reset all state to initial values from props
    setActiveExercises(initialExercises);
    setSupersetStatus(initialSupersetStatus);
    setSessionNotes({});
    // Reset sets to empty so they get re-initialized
    const initialSets: Record<string, WorkoutSet[]> = {};
    initialExercises.forEach((ex) => {
      initialSets[ex.id] = [createEmptySet(ex.type as ExerciseType)];
    });
    setSets(initialSets);
    toast.success("Workout reset to routine");
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

      // Apply the loaded sets
      setSets((prev) => ({
        ...prev,
        [exerciseId]: data.sets
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

  const startTimeDisplay = new Date(initialStartTime).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="mx-auto flex max-w-md px-4 flex-col gap-6 py-6 pb-24">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between lg:px-0">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground bg-muted/50 rounded-full border px-3 py-1 text-sm font-medium">
            Started at {startTimeDisplay}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Workout Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setResetAlertOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Routine
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed">
        <span
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-help"
          title="Click set number to toggle"
        >
          Click set number to toggle:
        </span>
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted border border-transparent ring-1 ring-border/20"></span>
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-200 border border-orange-300 dark:bg-orange-500/50 dark:border-orange-500"></span>
            Warmup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-200 border border-red-300 dark:bg-red-500/50 dark:border-red-500"></span>
            Failure
          </span>
        </div>
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
                  className="h-full w-full object-contain"
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
                  {(ex.targetSets || ex.targetReps || ex.targetRepsToFailure) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {ex.targetSets && (
                        <span className="flex items-center gap-1" title="Target sets">
                          <Repeat className="h-3 w-3" />
                          {ex.targetSets} sets
                        </span>
                      )}
                      {ex.targetReps && (
                        <span className="flex items-center gap-1" title="Target reps">
                          <Target className="h-3 w-3" />
                          {ex.targetReps} reps
                        </span>
                      )}
                      {ex.targetRepsToFailure && (
                        <span
                          className="flex items-center gap-1 text-orange-600 dark:text-orange-400"
                          title="Reps to failure"
                        >
                          🔥 {ex.targetRepsToFailure} RIF
                        </span>
                      )}
                    </div>
                  )}

                  {/* Routine Note (Static, not editable) */}
                  {ex.routineNote && (
                    <p className="mt-1 text-sm text-muted-foreground italic">{ex.routineNote}</p>
                  )}

                  {/* Session Note Display (Text Only) */}
                  {/* Session Note UI - Replaces old display and button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="mt-2 text-sm cursor-pointer hover:opacity-80 transition-opacity">
                        {sessionNotes[ex.id] ? (
                          <div className="text-foreground/80 bg-background px-2 py-1.5 rounded-md flex items-start gap-2 border w-full">
                            <MessageSquareText className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                            <span className="leading-snug">{sessionNotes[ex.id]}</span>
                          </div>
                        ) : (
                          <div className="border border-dashed border-muted-foreground/30 rounded-md p-1.5 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors w-fit">
                            <MessageSquareText className="h-3.5 w-3.5" />
                            <span className="text-xs">Add Insight</span>
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
                          className="min-h-[100px]"
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
                        <DropdownMenuItem
                          onClick={() => {
                            setSupersetStatus((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }));
                          }}
                        >
                          <Zap
                            className={`mr-2 h-4 w-4 ${supersetStatus[ex.id] ? "text-amber-500 fill-amber-500" : ""}`}
                          />
                          <span className={supersetStatus[ex.id] ? "font-bold text-amber-500" : ""}>
                            {supersetStatus[ex.id] ? "Active Superset" : "Toggle Superset"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReplaceExercise(index)}>
                          <ArrowLeftRight className="mr-2 h-4 w-4" />
                          Replace Exercise
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Exercise
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {ex.type === ExerciseType.CARDIO ? (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 text-sm font-medium">
                  <div className="w-8 text-center">#</div>
                  <div>Minutes</div>
                  <div>Km</div>
                  <div>Calories</div>
                  <div className="w-8"></div>
                </div>
              ) : (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_auto] gap-4 text-sm font-medium">
                  <div className="w-8 text-center">#</div>
                  <div>kg</div>
                  <div>Reps</div>
                  <div className="w-8"></div>
                </div>
              )}

              {(sets[ex.id] || [createEmptySet(ex.type as ExerciseType)]).map((set, idx) => (
                <div
                  key={idx}
                  className={`grid gap-4 items-center ${
                    ex.type === ExerciseType.CARDIO
                      ? "grid-cols-[auto_1fr_1fr_1fr_auto]"
                      : "grid-cols-[auto_1fr_1fr_auto]"
                  } ${set.completed ? "opacity-50" : ""}`}
                >
                  <div
                    className={`flex h-7 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border text-sm font-bold transition-colors select-none ${
                      !set.type || set.type === "NORMAL"
                        ? "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                        : set.type === "WARMUP"
                          ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                    }`}
                    onClick={() => toggleSetType(ex.id, idx)}
                    title="Click to toggle: Normal -> Warmup -> Failure"
                  >
                    {idx + 1}
                  </div>
                  {ex.type === ExerciseType.CARDIO ? (
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
                + Add Set
              </Button>
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed py-8">
          <Button size="lg" className="h-12 w-48 gap-2 text-base" onClick={openAddExercise}>
            <Plus className="h-5 w-5" />
            Add Exercise
          </Button>

          <Dialog open={cardioModalOpen} onOpenChange={setCardioModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="h-12 w-48 gap-2 text-base">
                <Activity className="h-5 w-5" />
                Add Cardio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Choose Cardio Type</DialogTitle>
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

      {/* Footer Actions - Sticky on scroll up */}
      <div
        className={`sticky -mx-4 md:mx-0 bottom-19.25 md:bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-2 shadow-lg z-50 transition-transform duration-200 ${
          showFooter ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <Button className="flex-1 bg-green-600 text-white hover:bg-green-700" onClick={handleSave}>
          Save
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
          onClick={handleFinish}
          disabled={!isFormValid}
        >
          Finish
        </Button>
      </div>

      <ExerciseSelector
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleExerciseSelect}
        selectedExerciseIds={activeExercises.map((e) => e.id)}
        preferredCategories={
          Array.from(new Set(activeExercises.map((e) => e.category).filter(Boolean))) as string[]
        }
        trigger={<div className="hidden" />}
      />

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Exercise?</AlertDialogTitle>
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

      <AlertDialog open={saveSuccessOpen} onOpenChange={setSaveSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Progress Saved</AlertDialogTitle>
            <AlertDialogDescription>
              Your workout has been saved successfully. Would you like to exit to the home screen or
              continue working out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaveSuccessOpen(false)}>
              Continue Here
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/")}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetAlertOpen} onOpenChange={setResetAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Workout?</AlertDialogTitle>
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
