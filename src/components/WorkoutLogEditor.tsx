import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { navigate } from "astro:transitions/client";
import type { Exercise, WorkoutLogEntry } from "prisma/generated/client";
import React, { useState } from 'react';

type WorkoutLogEntryWithExercise = WorkoutLogEntry & { exercise: Exercise };

interface WorkoutLogEditorProps {
  initialEntries: WorkoutLogEntryWithExercise[];
  onSave: (entries: WorkoutLogEntryButSetsAny[]) => Promise<void>;
  onDelete: () => Promise<void>;
}

// Helper type since sets are JSON in Prisma but we use them as objects here
type WorkoutLogEntryButSetsAny = Omit<WorkoutLogEntryWithExercise, 'sets'> & { sets: any[] };

export const WorkoutLogEditor: React.FC<WorkoutLogEditorProps> = ({
  initialEntries,
  onSave,
  onDelete
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
    await onSave(entries);
    navigate("/history");
  };

  const handleDelete = async () => {
    await onDelete();
    navigate("/history");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleDelete}>Delete Log</Button>
      </div>

      {entries.map((entry, entryIdx) => (
        <Card key={entry.id}>
          <CardHeader>
            <CardTitle>{entry.exercise.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
              <div>Set</div>
              <div>kg</div>
              <div>Reps</div>
            </div>
            {entry.sets.map((set: any, setIdx: number) => (
              <div key={setIdx} className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center font-bold bg-muted rounded py-2">{setIdx + 1}</div>
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
              </div>
            ))}
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
