import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { navigate } from "astro:transitions/client";
import { MessageSquareText, MoreVertical, Trash2, X, Zap } from "lucide-react";
import type { Exercise, WorkoutLogEntry } from "prisma/generated/client";
import React, { useState } from "react";
import { type SetType } from "./ActiveWorkout";
import { ExerciseInfoModal } from "./ExerciseInfoModal";

type WorkoutLogEntryWithExercise = WorkoutLogEntry & { exercise: Exercise };

interface WorkoutLogEditorProps {
  logId: string;
  initialEntries: WorkoutLogEntryWithExercise[];
}

// Helper type since sets are JSON in Prisma but we use them as objects here
type WorkoutLogEntryButSetsAny = Omit<WorkoutLogEntryWithExercise, "sets"> & { sets: any[] };

export const WorkoutLogEditor: React.FC<WorkoutLogEditorProps> = ({ logId, initialEntries }) => {
  const [entries, setEntries] = useState<WorkoutLogEntryButSetsAny[]>(
    initialEntries.map((e) => ({ ...e, sets: e.sets as any[] }))
  );

  const updateSet = (entryIndex: number, setIndex: number, field: string, value: any) => {
    const newEntries = [...entries];
    const newSets = [...newEntries[entryIndex].sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    newEntries[entryIndex] = { ...newEntries[entryIndex], sets: newSets };
    setEntries(newEntries);
  };

  const toggleSetType = (entryIndex: number, setIndex: number) => {
    const currentEntry = entries[entryIndex];
    if (!currentEntry) return;

    const set = currentEntry.sets[setIndex];
    let nextType: SetType = "NORMAL";

    if (!set.type || set.type === "NORMAL") nextType = "WARMUP";
    else if (set.type === "WARMUP") nextType = "FAILURE";
    else nextType = "NORMAL";

    updateSet(entryIndex, setIndex, "type", nextType);
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

    await fetch(`/api/workout-logs/${logId}`, {
      method: "PUT",
      body: JSON.stringify({ entries: entriesPayload, sessionNotes, supersetStatus }),
      headers: { "Content-Type": "application/json" }
    });
    navigate("/history");
  };

  const handleDelete = async () => {
    await fetch(`/api/workout-logs/${logId}`, {
      method: "DELETE"
    });
    navigate("/history");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end px-1">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this workout log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {entries.map((entry, entryIdx) => (
        <Card key={entry.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold mt-1">
                    {entryIdx + 1}
                  </div>
                  {(entry.exercise as any).imageUrl && (
                    <img
                      src={(entry.exercise as any).imageUrl}
                      alt={entry.exercise.name}
                      className="h-12 w-12 shrink-0 rounded border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 font-bold capitalize flex items-center gap-2 text-sm sm:text-base leading-none">
                      {entry.exercise.name}
                      <ExerciseInfoModal exercise={entry.exercise as any} />
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
                  {entry.isSuperset && <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />}
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
                          className={`mr-2 h-4 w-4 ${entry.isSuperset ? "text-amber-500 fill-amber-500" : ""}`}
                        />
                        <span className={entry.isSuperset ? "font-bold text-amber-500" : ""}>
                          {entry.isSuperset ? "Active Superset" : "Toggle Superset"}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Session Note UI */}
              <Dialog>
                <DialogTrigger asChild>
                  <div className="mt-2 text-sm cursor-pointer hover:opacity-80 transition-opacity">
                    {entry.note ? (
                      <div className="text-foreground/80 bg-background px-2 py-1.5 rounded-md flex items-start gap-2 border w-fit">
                        <MessageSquareText className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <span className="leading-snug">{entry.note}</span>
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
                    <DialogTitle>Session Note for {entry.exercise.name}</DialogTitle>
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

              {/* Sets Header */}
              {entry.exercise.type === "CARDIO" ? (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-sm font-medium">
                  <div className="w-8 text-center">#</div>
                  <div>Minutes</div>
                  <div>Km</div>
                  <div>Calories</div>
                  <div></div>
                </div>
              ) : (
                <div className="text-muted-foreground grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-sm font-medium">
                  <div className="w-8 text-center">#</div>
                  <div>kg</div>
                  <div>Reps</div>
                  <div></div>
                </div>
              )}

              {/* Sets List */}
              {entry.sets.map((set: any, setIdx: number) => (
                <div
                  key={setIdx}
                  className={`grid items-center gap-2 ${entry.exercise.type === "CARDIO" ? "grid-cols-[auto_1fr_1fr_1fr_auto]" : "grid-cols-[auto_1fr_1fr_auto]"}`}
                >
                  <div
                    className={`flex h-7 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border text-sm font-bold transition-colors select-none ${
                      !set.type || set.type === "NORMAL"
                        ? "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                        : set.type === "WARMUP"
                          ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                          : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                    }`}
                    onClick={() => toggleSetType(entryIdx, setIdx)}
                    title="Click to toggle: Normal -> Warmup -> Failure"
                  >
                    {setIdx + 1}
                  </div>

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
                      <Input
                        type="number"
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(entryIdx, setIdx, "weight", Number(e.target.value))
                        }
                        className="text-center"
                      />
                      <Input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(entryIdx, setIdx, "reps", Number(e.target.value))
                        }
                        className="text-center"
                      />
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
                        (_: any, i: number) => i !== setIdx
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
                + Add Set
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/history")}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};
