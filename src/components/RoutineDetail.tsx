import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { navigate } from "astro:transitions/client";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import type { Exercise, RoutineExercise } from "prisma/generated/client";
import React, { useEffect, useState } from 'react';

type RoutineExerciseWithExercise = RoutineExercise & { exercise: Exercise };

interface RoutineDetailProps {
  routineId: string;
  routineName: string;
  initialExercises: RoutineExerciseWithExercise[];
}

export const RoutineDetail: React.FC<RoutineDetailProps> = ({
  routineId,
  routineName,
  initialExercises,
}) => {
  const [exercises, setExercises] = useState<RoutineExerciseWithExercise[]>(initialExercises);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => setAvailableExercises(data));
  }, []);

  const handleAdd = async (exerciseId: string) => {
    try {
      await fetch("/api/routine-exercises", {
        method: "POST",
        body: JSON.stringify({ routineId: routineId, exerciseId }),
        headers: { "Content-Type": "application/json" },
      });
      setOpen(false);
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to add exercise", error);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this exercise?")) return;
    try {
      await fetch(`/api/routine-exercises?id=${id}`, {
        method: "DELETE",
      });
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to remove exercise", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{routineName}</h2>
          <p className="text-muted-foreground">{exercises.length} exercises</p>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="default"
              role="combobox"
              aria-expanded={open}
              className="w-full sm:w-[250px] justify-between"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Exercise
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search exercise..." />
              <CommandList>
                <CommandEmpty>No exercise found.</CommandEmpty>
                <CommandGroup heading="Available Exercises">
                  {availableExercises.map((ex) => {
                    const isAdded = exercises.some(e => e.exerciseId === ex.id);
                    return (
                      <CommandItem
                        key={ex.id}
                        value={ex.name}
                        onSelect={() => handleAdd(ex.id)}
                        disabled={isAdded}
                        className={cn("cursor-pointer", isAdded && "opacity-50")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isAdded ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          {ex.imageUrl && <img src={ex.imageUrl} className="w-6 h-6 rounded object-cover" />}
                          <div className="flex flex-col">
                            <span>{ex.name}</span>
                            <span className="text-xs text-muted-foreground">{ex.category}</span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-4">
        {exercises.map((re, index) => (
          <Card key={re.id} className="overflow-hidden">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-muted-foreground text-sm">
                  {index + 1}
                </div>
                {re.exercise.imageUrl && (
                  <img src={re.exercise.imageUrl} alt={re.exercise.name} className="w-12 h-12 rounded object-cover border" />
                )}
                <div>
                  <h3 className="font-bold">{re.exercise.name}</h3>
                  <span className="text-xs text-muted-foreground capitalize">{re.exercise.category}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemove(re.id)}>
                <Trash2 className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {exercises.length === 0 && (
          <div className="text-center py-12 px-4 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/50">
            <p className="mb-2">No exercises in this routine yet.</p>
            <p className="text-sm">Click "Add Exercise" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
