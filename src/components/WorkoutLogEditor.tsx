import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InputWarning } from "@/components/ui/InputWarning";
import { Textarea } from "@/components/ui/textarea";
import { useInputVerification } from "@/hooks/useInputVerification";
import type { WorkoutSet } from "@/lib/progressive-overload";
import { cn } from "@/lib/utils";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { ArrowDown, ArrowUp, Check, MessageSquareText, MoreVertical, X, Zap } from "lucide-react";
import type { Exercise, Routine, RoutineExercise, WorkoutLogEntry } from "prisma/generated/client";
import React, { useEffect, useRef, useState } from "react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { SetTypeSelector } from "./SetTypeSelector";
import { TargetDisplay } from "./TargetDisplay";

type WorkoutLogEntryWithExercise = WorkoutLogEntry & { exercise: Exercise };

export interface WorkoutLogEditorProps {
  logId: string;
  initialEntries: WorkoutLogEntryWithExercise[];
  routine?: Routine & { exercises: RoutineExercise[] };
  reorderMode: boolean;
  setReorderMode: (mode: boolean) => void;
}

// Helper type since sets are JSON in Prisma but we use them as objects here
type WorkoutLogEntryButSetsFixed = Omit<WorkoutLogEntryWithExercise, "sets"> & {
  sets: WorkoutSet[];
};

export const WorkoutLogEditor: React.FC<WorkoutLogEditorProps> = ({
  logId,
  initialEntries,
  routine,
  reorderMode,
  setReorderMode
}) => {
  const [entries, setEntries] = useState<WorkoutLogEntryButSetsFixed[]>(
    initialEntries.map((e) => ({ ...e, sets: e.sets as unknown as WorkoutSet[] }))
  );
  // Removed local reorderMode state
  const { inputWarnings, verifyInput, clearWarning } = useInputVerification();
  const itemsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastMovedIndexRef = useRef<number | null>(null);

  const updateSet = (entryIndex: number, setIndex: number, field: string, value: any) => {
    const newEntries = [...entries];
    const newSets = [...newEntries[entryIndex].sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    newEntries[entryIndex] = { ...newEntries[entryIndex], sets: newSets };
    setEntries(newEntries);
  };

  const updateNote = (entryIndex: number, note: string) => {
    const newEntries = [...entries];
    newEntries[entryIndex] = { ...newEntries[entryIndex], note };
    setEntries(newEntries);
  };

  const toggleSuperset = (entryIndex: number) => {
    const newEntries = [...entries];
    newEntries[entryIndex] = {
      ...newEntries[entryIndex],
      isSuperset: !newEntries[entryIndex].isSuperset
    };
    setEntries(newEntries);
  };

  const handleMoveEntry = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === entries.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newEntries = [...entries];

    // Swap
    [newEntries[index], newEntries[newIndex]] = [newEntries[newIndex], newEntries[index]];

    lastMovedIndexRef.current = newIndex;
    setEntries(newEntries);

    // Immediate save to DB
    actions.workout.updateSession({
      id: logId,
      exerciseOrder: newEntries.map((e) => e.exerciseId)
    });
  };

  useEffect(() => {
    if (lastMovedIndexRef.current !== null) {
      const element = itemsRef.current.get(lastMovedIndexRef.current);
      if (element) {
        element.scrollIntoView({ block: "center" });
      }
      lastMovedIndexRef.current = null;
    }
  }, [entries]);

  const handleSave = async () => {
    // Transform array back to Record<exerciseId, sets[]> for backend consistency
    const entriesPayload: Record<string, any> = {};

    entries.forEach((entry) => {
      entriesPayload[entry.exerciseId] = entry.sets;
    });

    // Also map session notes
    const sessionNotes: Record<string, string> = {};
    entries.forEach((entry) => {
      if (entry.note) sessionNotes[entry.exerciseId] = entry.note;
    });

    // Map superset status
    const supersetStatus: Record<string, boolean> = {};
    entries.forEach((entry) => {
      supersetStatus[entry.exerciseId] = entry.isSuperset;
    });

    await actions.workout.updateSession({
      id: logId,
      entries: entriesPayload,
      sessionNotes,
      supersetStatus,
      exerciseOrder: entries.map((e) => e.exerciseId)
    });
    navigate("/history");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {/* Dropdown removed as it's moved to parent/header */}
      </div>

      {entries.map((entry, entryIdx) => (
        <Card
          key={entry.id}
          ref={(el) => {
            if (el) itemsRef.current.set(entryIdx, el);
            else itemsRef.current.delete(entryIdx);
          }}
          className="relative overflow-hidden"
        >
          {reorderMode && (
            <div className="absolute top-20 right-3 z-10 flex flex-col gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-90 shadow-sm hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveEntry(entryIdx, "up");
                }}
                disabled={entryIdx === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-90 shadow-sm hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveEntry(entryIdx, "down");
                }}
                disabled={entryIdx === entries.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          )}
          <CardContent className="p-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="bg-muted text-muted-foreground mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    {entryIdx + 1}
                  </div>
                  {entry.exercise.imageUrl && (
                    <img
                      src={entry.exercise.imageUrl}
                      alt={entry.exercise.name}
                      className="h-12 w-12 shrink-0 rounded border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 flex items-center gap-2 text-sm leading-none font-bold capitalize sm:text-base">
                      {entry.exercise.name}
                      <ExerciseInfoModal exercise={entry.exercise} />
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] capitalize">
                        {entry.exercise.bodyPart}
                      </span>
                      {entry.exercise.target && (
                        <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] capitalize">
                          {entry.exercise.target}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Actions Menu */}
                <div className="flex items-center gap-1">
                  {entry.isSuperset && <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => toggleSuperset(entryIdx)}>
                        <Zap
                          className={`mr-2 h-4 w-4 ${entry.isSuperset ? "fill-amber-500 text-amber-500" : ""}`}
                        />
                        <span className={entry.isSuperset ? "font-bold text-amber-500" : ""}>
                          {entry.isSuperset ? "Active superset" : "Toggle superset"}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div>
                {routine &&
                  (() => {
                    const re = routine.exercises.find((e) => e.exerciseId === entry.exerciseId);
                    if (re) {
                      return (
                        <>
                          <TargetDisplay
                            targetSets={re.targetSets}
                            targetReps={re.targetReps}
                            targetType={re.targetType}
                            targetRepsToFailure={re.targetRepsToFailure}
                            incrementValue={re.incrementValue}
                            className="mb-1.5"
                          />
                          {re.note && (
                            <div className="text-muted-foreground bg-muted/20 mt-2 mb-2 w-fit rounded-r border-l-4 py-1 pr-2 pl-3 text-sm whitespace-pre-wrap">
                              {re.note}
                            </div>
                          )}
                        </>
                      );
                    }
                    return null;
                  })()}

                {/* Session Note UI */}
                <Dialog>
                  <DialogTrigger asChild>
                    {/* Targets Display (Readonly) */}
                    <div className="mt-2 w-fit cursor-pointer text-sm transition-opacity hover:opacity-80">
                      {entry.note ? (
                        <div className="text-foreground/80 bg-background flex w-fit items-start gap-2 rounded-md border px-2 py-1.5">
                          <MessageSquareText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                          <span className="leading-snug whitespace-pre-wrap">{entry.note}</span>
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
                      <DialogTitle>Session note for {entry.exercise.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                      <Textarea
                        placeholder="How did it feel?"
                        value={entry.note || ""}
                        onChange={(e) => updateNote(entryIdx, e.target.value)}
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

              {/* Sets Header */}
              {entry.exercise.type === "CARDIO" ? (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 text-sm font-medium">
                  <div className="w-6 text-center">#</div>
                  <div className="text-center">Minutes</div>
                  <div className="text-center">Km</div>
                  <div className="text-center">Calories</div>
                  <div className="w-8"></div>
                </div>
              ) : (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_auto] gap-4 text-sm font-medium">
                  <div className="w-8 text-center">#</div>
                  <div className="text-center">Kg</div>
                  <div className="text-center">
                    {routine?.exercises.find((e) => e.exerciseId === entry.exerciseId)
                      ?.targetType === "DURATION"
                      ? "Secs"
                      : "Reps"}
                  </div>
                  <div className="w-8"></div>
                </div>
              )}

              {/* Sets List */}
              {entry.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`grid items-center gap-2 ${entry.exercise.type === "CARDIO" ? "grid-cols-[auto_1fr_1fr_1fr_auto]" : "grid-cols-[auto_1fr_1fr_auto]"}`}
                >
                  <SetTypeSelector
                    setNumber={setIdx + 1}
                    type={set.type}
                    onChange={(newType) => updateSet(entryIdx, setIdx, "type", newType)}
                  />

                  {entry.exercise.type === "CARDIO" ? (
                    <>
                      <Input
                        type="number"
                        value={set.duration === "" ? "" : set.duration}
                        onChange={(e) =>
                          updateSet(entryIdx, setIdx, "duration", Number(e.target.value))
                        }
                        className="px-1 text-center"
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        value={set.distance === "" ? "" : set.distance}
                        onChange={(e) =>
                          updateSet(entryIdx, setIdx, "distance", Number(e.target.value))
                        }
                        className="px-1 text-center"
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        value={set.calories === "" ? "" : set.calories}
                        onChange={(e) =>
                          updateSet(entryIdx, setIdx, "calories", Number(e.target.value))
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
                            clearWarning(entry.id, setIdx, "weight");
                            updateSet(
                              entryIdx,
                              setIdx,
                              "weight",
                              e.target.value === "" ? "" : Number(e.target.value)
                            );
                          }}
                          onBlur={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            if (val > 0) verifyInput(entry.sets, setIdx, val, "weight", entry.id);
                          }}
                          className={cn(
                            "text-center transition-colors",
                            inputWarnings[`${entry.id}-${setIdx}-weight`] &&
                              "border-amber-500 focus-visible:ring-amber-500"
                          )}
                          placeholder="0"
                        />
                        {inputWarnings[`${entry.id}-${setIdx}-weight`] && (
                          <InputWarning message={inputWarnings[`${entry.id}-${setIdx}-weight`]} />
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={set.reps === "" ? "" : set.reps}
                          onChange={(e) => {
                            clearWarning(entry.id, setIdx, "reps");
                            updateSet(
                              entryIdx,
                              setIdx,
                              "reps",
                              e.target.value === "" ? "" : Number(e.target.value)
                            );
                          }}
                          onBlur={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            if (val > 0) verifyInput(entry.sets, setIdx, val, "reps", entry.id);
                          }}
                          className={cn(
                            "text-center transition-colors",
                            inputWarnings[`${entry.id}-${setIdx}-reps`] &&
                              "border-amber-500 focus-visible:ring-amber-500"
                          )}
                          placeholder="0"
                        />
                        {inputWarnings[`${entry.id}-${setIdx}-reps`] && (
                          <InputWarning message={inputWarnings[`${entry.id}-${setIdx}-reps`]} />
                        )}
                      </div>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => {
                      if (entry.sets.length <= 1) return;
                      const newEntries = [...entries];
                      newEntries[entryIdx].sets = newEntries[entryIdx].sets.filter(
                        (_, i) => i !== setIdx
                      );
                      setEntries(newEntries);
                    }}
                    disabled={entry.sets.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  const newEntries = [...entries];
                  const lastSet = newEntries[entryIdx].sets[
                    newEntries[entryIdx].sets.length - 1
                  ] || {
                    weight: 0,
                    reps: 0,
                    completed: false
                  };
                  newEntries[entryIdx].sets = [
                    ...newEntries[entryIdx].sets,
                    { ...lastSet, type: "NORMAL" }
                  ];
                  setEntries(newEntries);
                }}
              >
                + Add set
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/history")}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save changes</Button>
      </div>

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
    </div>
  );
};
