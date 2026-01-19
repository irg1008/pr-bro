import { ExerciseSelector } from "@/components/ExerciseSelector";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, Trash2, X } from "lucide-react";
// Ensure we only import TYPE from prisma, not values.
import type { Exercise } from "prisma/generated/client";
import React, { useEffect, useState } from 'react';

// Define ExerciseType locally to avoid importing Prisma runtime code in client component
export const ExerciseType = {
  WEIGHT: 'WEIGHT',
  CARDIO: 'CARDIO'
} as const;
export type ExerciseType = typeof ExerciseType[keyof typeof ExerciseType];

export interface WorkoutSet {
  weight?: number | '';
  reps?: number | '';
  duration?: number | ''; // minutes?
  distance?: number | ''; // km?
  calories?: number | '';
  completed: boolean;
}

export interface ActiveWorkoutProps {
  logId: string;
  initialStartTime: string;
  routineName: string;
  exercises: Exercise[];
  onCancel: () => void;
  onCompleteWorkout: () => void;
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  logId,
  initialStartTime,
  routineName,
  exercises: initialExercises,
  onCancel,
  onCompleteWorkout
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [sets, setSets] = useState<Record<string, WorkoutSet[]>>({});

  // Dynamic Exercise State
  const [activeExercises, setActiveExercises] = useState<Exercise[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'replace'>('add');

  // Fetch existing log data on mount (resume support)
  useEffect(() => {
    const loadLog = async () => {
      try {
        const res = await fetch(`/api/workout-logs/${logId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.entries && data.entries.length > 0) {
            const loadedSets: Record<string, WorkoutSet[]> = {};
            // Assuming entries includes relation to set data which we need to parse
            // The API returns entries as object directly if stored as Json?
            // Let's assume the API structure returns { entries: { [exId]: sets[] } } or similar
            // Adjust based on typical API response. 
            // Actually API returns log object. entries field is Json.
            if (typeof data.entries === 'object' && !Array.isArray(data.entries)) {
              // It's likely the Record<string, WorkoutSet[]> map itself if stored that way
              setSets(data.entries);
            } else if (Array.isArray(data.entries)) {
              // Legacy or array format? 
              // If we store entire sets map as one JSON field called 'entries':
              // The backend implementation of PUT accepts `entries`.
              // So we should be able to load it back.
              // We'll trust `data.entries` is the Record.
              setSets(data.entries);
            }
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

  const onScroll = React.useCallback((api: CarouselApi) => {
    if (!api) return;

    const scrollProgress = api.scrollProgress();
    const snapList = api.scrollSnapList();
    const slides = api.slideNodes();

    slides.forEach((slide, index) => {
      const snap = snapList[index];
      const diff = snap - scrollProgress;
      const machineDistance = Math.abs(diff);
      const slideCount = slides.length;
      const normalizedDistance = machineDistance * (slideCount - 1);
      const factor = Math.min(Math.max(1 - normalizedDistance, 0), 1);

      const opacity = 0.3 + (0.7 * factor);
      const scale = 0.9 + (0.1 * factor);
      const blur = (1 - factor) * 4;

      const inner = slide.querySelector('.carousel-visual-content') as HTMLElement;
      if (inner) {
        inner.style.opacity = opacity.toString();
        inner.style.transform = `scale(${scale})`;
        inner.style.filter = `blur(${blur}px)`;
      }
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    onScroll(api);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    api.on("scroll", () => {
      onScroll(api);
    });

    api.on("reInit", () => {
      onScroll(api);
      setCurrent(api.selectedScrollSnap());
    });

  }, [api, onScroll]);

  const currentExercise = activeExercises[current] || activeExercises[0];

  const createEmptySet = (type: ExerciseType = ExerciseType.WEIGHT): WorkoutSet => {
    if (type === ExerciseType.CARDIO) {
      return { duration: '', distance: '', calories: '', completed: false };
    }
    return { weight: '', reps: '', completed: false };
  };

  const updateSet = (idx: number, field: keyof WorkoutSet, value: number | '') => {
    const exId = currentExercise?.id;
    if (!exId) return;

    const currentExSets = sets[exId] || [createEmptySet(currentExercise?.type)];
    const newSets = [...currentExSets];
    newSets[idx] = { ...newSets[idx], [field]: value };
    setSets({ ...sets, [exId]: newSets });
  };

  const addSet = () => {
    const exId = currentExercise?.id;
    if (!exId) return;

    const currentExSets = sets[exId] || [createEmptySet(currentExercise?.type)];
    const lastSet = currentExSets[currentExSets.length - 1];
    setSets({
      ...sets,
      [exId]: [...currentExSets, { ...lastSet, completed: false }]
    });
  };

  const removeSet = (idx: number) => {
    const exId = currentExercise?.id;
    if (!exId) return;

    const currentExSets = sets[exId] || [createEmptySet(currentExercise?.type)];
    if (currentExSets.length <= 1) return;

    const newSets = currentExSets.filter((_, i) => i !== idx);
    setSets({ ...sets, [exId]: newSets });
  };

  const goToNext = () => {
    api?.scrollNext();
  };

  const validateAll = () => {
    return activeExercises.every(ex => {
      const exSets = sets[ex.id] || [createEmptySet(ex.type)];
      return exSets.every(s => {
        if (ex.type === ExerciseType.CARDIO) {
          // Require Duration OR Distance
          return s.duration !== '' || s.distance !== '';
        } else {
          return s.weight !== '' && s.reps !== '';
        }
      });
    });
  };

  const isFormValid = validateAll();

  const handleSave = async () => {
    // Save regardless of validity (save partial progress)
    // But maybe we only auto-save if something is there?
    // Let's just save.
    try {
      await fetch(`/api/workout-logs/${logId}`, {
        method: 'PUT',
        body: JSON.stringify({
          entries: sets
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleFinish = async () => {
    if (!isFormValid) return;
    const completeSets = { ...sets };

    // Ensure data exists for all
    activeExercises.forEach(ex => {
      if (!completeSets[ex.id]) {
        completeSets[ex.id] = [createEmptySet(ex.type)];
      }
    });

    try {
      await fetch(`/api/workout-logs/${logId}`, {
        method: 'PUT',
        body: JSON.stringify({
          entries: completeSets,
          finishedAt: new Date().toISOString()
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      onCompleteWorkout();
    } catch (e) {
      console.error("Finish failed", e);
    }
  };

  const handleCancel = async () => {
    // Auto-save on cancel
    await handleSave();
    onCancel();
  };

  const openAddExercise = () => {
    setPickerMode('add');
    setPickerOpen(true);
  };

  const openReplaceExercise = () => {
    setPickerMode('replace');
    setPickerOpen(true);
  };

  const handleExerciseSelect = async (exercise: Exercise) => {
    if (!exercise) return;

    if (pickerMode === 'add') {
      setActiveExercises(prev => [...prev, exercise]);
      // Give time for render then scroll
      setTimeout(() => api?.scrollTo(activeExercises.length), 100);
    } else {
      const newExercises = [...activeExercises];
      if (current >= 0 && current < newExercises.length) {
        const oldExId = newExercises[current].id;
        newExercises[current] = exercise;
        setActiveExercises(newExercises);

        // Reset sets for this slot
        const { [oldExId]: _removed, ...restSets } = sets;
        setSets({ ...restSets, [exercise.id]: [createEmptySet(exercise.type)] });
      }
    }
    setPickerOpen(false);
  };

  const handleQuickCardio = async () => {
    try {
      const res = await fetch('/api/exercises?search=Cardio&limit=1');
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        await handleExerciseSelect(data.data[0]);
        setTimeout(() => api?.scrollTo(activeExercises.length), 100);
      } else {
        openAddExercise();
      }
    } catch (e) {
      console.error("Quick cardio failed", e);
      openAddExercise();
    }
  };

  const handleDeleteExercise = async () => {
    if (!currentExercise) return;
    if (confirm("Remove this exercise from the workout?")) {
      const newExercises = activeExercises.filter(e => e.id !== currentExercise.id);
      setActiveExercises(newExercises);

      const { [currentExercise.id]: _removed, ...restSets } = sets;
      setSets(restSets);

      // Save changes immediately
      try {
        await fetch(`/api/workout-logs/${logId}`, {
          method: 'PUT',
          body: JSON.stringify({ entries: restSets }),
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) { console.error("Save failed", e); }
    }
  };

  const startTimeDisplay = new Date(initialStartTime).toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex flex-col h-full min-h-0 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center py-4 shrink-0 px-2 lg:px-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border">
            Started: {startTimeDisplay}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm font-medium bg-muted px-2 py-1 rounded">
            {current < activeExercises.length ? `${current + 1} / ${activeExercises.length}` : '+'}
          </div>
        </div>
      </div>

      {/* Main Content - Carousel */}
      <div className="flex-1 min-h-0 -mx-4">
        <Carousel setApi={setApi} className="w-full h-full">
          <CarouselContent className="h-full">
            {activeExercises.map((ex, index) => (
              <CarouselItem key={`${ex.id}-${index}`} className="h-full px-4 overflow-y-auto">
                <div
                  className="carousel-visual-content bg-card rounded-xl shadow-lg overflow-hidden mb-8 h-full transition-none will-change-transform"
                >
                  {ex.imageUrl && (
                    <div className="aspect-square w-full bg-muted">
                      <img
                        src={ex.imageUrl}
                        alt={ex.name}
                        onClick={() => { }} // dummy click to capture events if needed
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h2 className="text-xl font-bold capitalize pr-2">{ex.name}</h2>
                        {ex.type === ExerciseType.CARDIO && <span className="text-xs font-semibold text-blue-500">CARDIO</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleDeleteExercise} title="Remove Exercise">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground" onClick={openReplaceExercise}>
                          <ArrowLeftRight className="h-4 w-4" />
                          <span className="text-xs">Replace</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {ex.type === ExerciseType.CARDIO ? (
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-sm font-medium text-muted-foreground">
                        <div>Set</div>
                        <div>Min</div>
                        <div>Km</div>
                        <div>Kcal</div>
                        <div></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-sm font-medium text-muted-foreground">
                        <div>Set</div>
                        <div>kg</div>
                        <div>Reps</div>
                        <div></div>
                      </div>
                    )}

                    {(sets[ex.id] || [createEmptySet(ex.type)]).map((set, idx) => (
                      <div key={idx} className={`grid gap-2 items-center ${ex.type === ExerciseType.CARDIO ? 'grid-cols-[auto_1fr_1fr_1fr_auto]' : 'grid-cols-[auto_1fr_1fr_auto]'}`}>
                        <div className="text-center font-bold bg-muted rounded py-2 px-3">{idx + 1}</div>

                        {ex.type === ExerciseType.CARDIO ? (
                          <>
                            <Input
                              type="number"
                              value={set.duration === '' ? '' : set.duration}
                              onChange={(e) => updateSet(idx, 'duration', e.target.value === '' ? '' : Number(e.target.value))}
                              className="text-center px-1"
                              placeholder="0"
                            />
                            <Input
                              type="number"
                              value={set.distance === '' ? '' : set.distance}
                              onChange={(e) => updateSet(idx, 'distance', e.target.value === '' ? '' : Number(e.target.value))}
                              className="text-center px-1"
                              placeholder="0"
                            />
                            <Input
                              type="number"
                              value={set.calories === '' ? '' : set.calories}
                              onChange={(e) => updateSet(idx, 'calories', e.target.value === '' ? '' : Number(e.target.value))}
                              className="text-center px-1"
                              placeholder="0"
                            />
                          </>
                        ) : (
                          <>
                            <Input
                              type="number"
                              value={set.weight === '' ? '' : set.weight}
                              onChange={(e) => updateSet(idx, 'weight', e.target.value === '' ? '' : Number(e.target.value))}
                              className="text-center"
                              placeholder="0"
                            />
                            <Input
                              type="number"
                              value={set.reps === '' ? '' : set.reps}
                              onChange={(e) => updateSet(idx, 'reps', e.target.value === '' ? '' : Number(e.target.value))}
                              className="text-center"
                              placeholder="0"
                            />
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSet(idx)}
                          disabled={(sets[ex.id] || []).length <= 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button variant="outline" className="w-full" onClick={addSet}>
                      + Add Set
                    </Button>
                  </div>
                </div>
              </CarouselItem>
            ))}

            {/* Add New Exercise Slide */}
            <CarouselItem className="h-full px-4" key="add-new-slide">
              <div
                className="carousel-visual-content bg-card rounded-xl shadow-lg flex flex-col items-center justify-center gap-6 h-full mb-8 py-8"
              >
                <Button size="lg" className="w-48 h-12 text-base" onClick={openAddExercise}>
                  Add Exercise
                </Button>
                <Button variant="outline" size="lg" className="w-48 h-12 text-base" onClick={handleQuickCardio}>
                  Quick Cardio
                </Button>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      {/* Footer Actions */}
      <div className="py-4 bg-background border-t shrink-0 flex gap-2">
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        {current >= activeExercises.length ? (
          // On Add Slide
          <Button className="flex-1" size="lg" onClick={handleFinish} disabled={!isFormValid}>
            Finish Workout
          </Button>
        ) : (
          <div className="flex-1 flex gap-2">
            <Button className="flex-1" variant="secondary" onClick={goToNext}>
              Next
            </Button>
            {/* Show Finish on last exercise too, in case they don't want to add more */}
            {current === activeExercises.length - 1 && (
              <Button variant="outline" onClick={handleFinish} disabled={!isFormValid}>Finish</Button>
            )}
          </div>
        )}
      </div>

      <ExerciseSelector
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleExerciseSelect}
        selectedExerciseIds={activeExercises.map(e => e.id)}
        preferredCategories={Array.from(new Set(activeExercises.map(e => e.category).filter(Boolean))) as string[]}
        trigger={<div className="hidden" />}
      />
    </div >
  );
};
