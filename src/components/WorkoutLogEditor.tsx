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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { navigate } from "astro:transitions/client";
import { Trash2, X } from "lucide-react";
import type { Exercise, WorkoutLogEntry } from "prisma/generated/client";
import React, { useState } from 'react';

type WorkoutLogEntryWithExercise = WorkoutLogEntry & { exercise: Exercise };

interface WorkoutLogEditorProps {
  logId: string;
  initialEntries: WorkoutLogEntryWithExercise[];
}

// Helper type since sets are JSON in Prisma but we use them as objects here
type WorkoutLogEntryButSetsAny = Omit<WorkoutLogEntryWithExercise, 'sets'> & { sets: any[] };

export const WorkoutLogEditor: React.FC<WorkoutLogEditorProps> = ({
  logId,
  initialEntries,
}) => {
  const [entries, setEntries] = useState<WorkoutLogEntryButSetsAny[]>(
    initialEntries.map(e => ({ ...e, sets: e.sets as any[] }))
  );

  const updateSet = (entryIndex: number, setIndex: number, field: string, value: number) => {
    const newEntries = [...entries];
    const newSets = [...newEntries[entryIndex].sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    newEntries[entryIndex] = { ...newEntries[entryIndex], sets: newSets };
    setEntries(newEntries);
  };

  const handleSave = async () => {
    // Transform array back to Record<exerciseId, sets[]> for backend consistency
    const entriesPayload: Record<string, any> = {};

    entries.forEach(entry => {
      entriesPayload[entry.exerciseId] = entry.sets;
    });

    await fetch(`/api/workout-logs/${logId}`, {
      method: "PUT",
      body: JSON.stringify({ entries: entriesPayload }),
      headers: { "Content-Type": "application/json" },
    });
    navigate("/history");
  };

  const handleDelete = async () => {
    await fetch(`/api/workout-logs/${logId}`, {
      method: "DELETE",
    });
    navigate("/history");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end px-1">
        <AlertDialog>
          <AlertDialogTrigger render={

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
          } />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this workout log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {entries.map((entry, entryIdx) => (
        <Card key={entry.id}>
          <CardHeader className="flex flex-row items-center gap-4">
            {entry.exercise.imageUrl && (
              <img src={entry.exercise.imageUrl} alt={entry.exercise.name} className="w-16 h-16 rounded object-cover border" />
            )}
            <div className="flex flex-col">
              <CardTitle className="capitalize">{entry.exercise.name}</CardTitle>
              <div className="flex gap-2 items-center mt-1 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded capitalize">
                  {entry.exercise.category?.toLowerCase() || 'other'}
                </span>
                {entry.exercise.target && entry.exercise.target !== entry.exercise.category && (
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded capitalize">
                    {entry.exercise.target.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {entry.exercise.type === 'CARDIO' ? (
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-sm font-medium text-muted-foreground">
                <div>Set</div>
                <div>Minutes</div>
                <div>Km</div>
                <div>Calories</div>
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

            {entry.sets.map((set: any, setIdx: number) => (
              <div key={setIdx} className={`grid gap-2 items-center ${entry.exercise.type === 'CARDIO' ? 'grid-cols-[auto_1fr_1fr_1fr_auto]' : 'grid-cols-[auto_1fr_1fr_auto]'}`}>
                <div className="text-center font-bold bg-muted rounded py-2 px-3">{setIdx + 1}</div>

                {entry.exercise.type === 'CARDIO' ? (
                  <>
                    <Input
                      type="number"
                      value={set.duration === '' ? '' : set.duration}
                      onChange={(e) => updateSet(entryIdx, setIdx, 'duration', Number(e.target.value))}
                      className="text-center px-1"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      value={set.distance === '' ? '' : set.distance}
                      onChange={(e) => updateSet(entryIdx, setIdx, 'distance', Number(e.target.value))}
                      className="text-center px-1"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      value={set.calories === '' ? '' : set.calories}
                      onChange={(e) => updateSet(entryIdx, setIdx, 'calories', Number(e.target.value))}
                      className="text-center px-1"
                      placeholder="0"
                    />
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(entryIdx, setIdx, 'weight', Number(e.target.value))}
                      className="text-center"
                    />
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(entryIdx, setIdx, 'reps', Number(e.target.value))}
                      className="text-center"
                    />
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (entry.sets.length <= 1) return;
                    const newEntries = [...entries];
                    newEntries[entryIdx].sets = newEntries[entryIdx].sets.filter((_: any, i: number) => i !== setIdx);
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
              className="w-full mt-2"
              onClick={() => {
                const newEntries = [...entries];
                const lastSet = newEntries[entryIdx].sets[newEntries[entryIdx].sets.length - 1] || { weight: 0, reps: 0, completed: false };
                newEntries[entryIdx].sets = [...newEntries[entryIdx].sets, { ...lastSet }];
                setEntries(newEntries);
              }}
            >
              + Add Set
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/history")}>Cancel</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};
