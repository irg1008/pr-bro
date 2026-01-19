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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { navigate } from "astro:transitions/client";
import {
  Activity,
  ArrowLeftRight,
  Bike,
  Dumbbell,
  Footprints,
  Plus,
  Timer,
  Trash2,
  Waves,
  X
} from "lucide-react";
import type { Exercise } from "prisma/generated/client"; // Ensure these exist or use "prisma/client" if generated is there
import { useEffect, useState } from "react";
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

export interface WorkoutSet {
  weight?: number | "";
  reps?: number | "";
  duration?: number | ""; // minutes?
  distance?: number | ""; // km?
  calories?: number | "";
  completed: boolean;
}

export interface ActiveWorkoutProps {
  logId: string;
  initialStartTime: string;
  routineName: string;
  exercises: Exercise[];
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

  // Dynamic Exercise State
  const [activeExercises, setActiveExercises] = useState<Exercise[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace">("add");
  const [targetExerciseIndex, setTargetExerciseIndex] = useState<number>(-1); // For replace/delete context if needed

  const [cardioModalOpen, setCardioModalOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [infoAlert, setInfoAlert] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: ""
  });
  const [supersetStatus, setSupersetStatus] =
    useState<Record<string, boolean>>(initialSupersetStatus);

  // Fetch existing log data on mount (resume support)
  useEffect(() => {
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
      return { duration: "", distance: "", calories: "", completed: false };
    }
    return { weight: "", reps: "", completed: false };
  };

  const updateSet = (
    exerciseId: string,
    idx: number,
    field: keyof WorkoutSet,
    value: number | ""
  ) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type as ExerciseType)];
    const newSets = [...currentExSets];
    newSets[idx] = { ...newSets[idx], [field]: value };
    setSets({ ...sets, [exerciseId]: newSets });
  };

  const addSet = (exerciseId: string) => {
    if (!exerciseId) return;

    const currentEx = activeExercises.find((e) => e.id === exerciseId);
    if (!currentEx) return;

    const currentExSets = sets[exerciseId] || [createEmptySet(currentEx.type as ExerciseType)];
    const lastSet = currentExSets[currentExSets.length - 1];
    setSets({
      ...sets,
      [exerciseId]: [...currentExSets, { ...lastSet, completed: false }]
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
          supersetStatus
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
    const completeSets = sanitizeSets();

    toast.promise(
      fetch(`/api/workout-logs/${logId}`, {
        method: "PUT",
        body: JSON.stringify({
          entries: completeSets,
          supersetStatus,
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
        error: "Failed to save workout."
      }
    );
  };

  const handleCancel = () => {
    navigate("/");
  };

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

  const startTimeDisplay = new Date(initialStartTime).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="mx-auto flex max-w-md px-4 flex-col gap-6 py-6">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between lg:px-0">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground bg-muted/50 rounded-full border px-3 py-1 text-sm font-medium">
            Started: {startTimeDisplay}
          </div>
        </div>
      </div>

      {/* Main Content - Scroll List */}
      <div className="flex flex-col gap-6">
        {activeExercises.map((ex, index) => (
          <div
            key={`${ex.id}-${index}`}
            className="carousel-visual-content bg-card overflow-hidden rounded-xl shadow-sm transition-none will-change-transform border"
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
                <div className="flex flex-col">
                  <h2 className="pr-2 text-lg font-bold capitalize">{ex.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground bg-secondary rounded px-2 py-0.5 text-xs font-medium capitalize">
                      {ex.category?.toLowerCase() || "other"}
                    </span>
                    {ex.target && ex.target !== ex.category && (
                      <span className="text-muted-foreground bg-secondary rounded px-2 py-0.5 text-xs font-medium capitalize">
                        {ex.target.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`cursor-pointer rounded border px-2 py-0.5 text-xs transition-colors select-none ${
                      supersetStatus[ex.id]
                        ? "border-amber-400 bg-amber-400 font-semibold text-white"
                        : "border-muted-foreground/30 text-muted-foreground hover:bg-muted bg-transparent"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSupersetStatus((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }));
                    }}
                    title="Toggle Superset"
                  >
                    Superset
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                    onClick={() => handleDeleteClick(index)}
                    title="Remove Exercise"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-8 gap-2"
                    onClick={() => openReplaceExercise(index)}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    <span className="text-xs">Replace</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {ex.type === ExerciseType.CARDIO ? (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-sm font-medium">
                  <div>Set</div>
                  <div>Minutes</div>
                  <div>Km</div>
                  <div>Calories</div>
                  <div></div>
                </div>
              ) : (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-sm font-medium">
                  <div>Set</div>
                  <div>kg</div>
                  <div>Reps</div>
                  <div></div>
                </div>
              )}

              {(sets[ex.id] || [createEmptySet(ex.type as ExerciseType)]).map((set, idx) => (
                <div
                  key={idx}
                  className={`grid items-center gap-2 ${ex.type === ExerciseType.CARDIO ? "grid-cols-[auto_1fr_1fr_1fr_auto]" : "grid-cols-[auto_1fr_1fr_auto]"}`}
                >
                  <div className="bg-muted rounded px-3 py-2 text-center font-bold">{idx + 1}</div>

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

      {/* Footer Actions */}
      <div className="flex shadow-md">
        <Button
          className="flex-1 bg-green-600 text-white hover:bg-green-700 mr-2"
          onClick={handleSave}
        >
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
