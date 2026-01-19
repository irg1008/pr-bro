import { ExerciseSelector } from "@/components/ExerciseSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { navigate } from "astro:transitions/client";
import { ArrowDown, ArrowUp, ListOrdered, Pencil, Trash2 } from "lucide-react";
import type { Exercise, RoutineExercise } from "prisma/generated/client";
import React, { useEffect, useState } from 'react';
import { Badge } from "./ui/badge";

type RoutineExerciseWithExercise = RoutineExercise & { exercise: Exercise };

interface RoutineDetailProps {
  routineId: string;
  routineName: string;
  initialExercises: RoutineExerciseWithExercise[];
  focusedParts?: string[];
}

export const RoutineDetail: React.FC<RoutineDetailProps> = ({
  routineId,
  routineName,
  initialExercises,
  focusedParts = [],
}) => {
  const [exercises, setExercises] = useState<RoutineExerciseWithExercise[]>(initialExercises);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(routineName);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(focusedParts);
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: string[]) => {
        setAvailableCategories(data);
      })
      .catch(err => console.error("Failed to fetch categories", err));
  }, []);

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: newName,
          focusedParts: selectedCategories
        }),
        headers: { "Content-Type": "application/json" },
      });
      setIsRenaming(false);
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to rename", error);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(current =>
      current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category]
    );
  };

  const handleAdd = async (exercise: Exercise) => {
    try {
      await fetch("/api/routine-exercises", {
        method: "POST",
        body: JSON.stringify({ routineId: routineId, exerciseId: exercise.id }),
        headers: { "Content-Type": "application/json" },
      });
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to add exercise", error);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === exercises.length - 1) return;

    const newExercises = [...exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];

    setExercises(newExercises);

    try {
      await fetch(`/api/routines/${routineId}/reorder`, {
        method: "POST",
        body: JSON.stringify({ routineExerciseIds: newExercises.map(e => e.id) }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Failed to reorder", e);
    }
  };

  const handleSortByCategory = async () => {
    const sorted = [...exercises].sort((a, b) => {
      const catA = (a.exercise.category || "").toLowerCase();
      const catB = (b.exercise.category || "").toLowerCase();
      if (catA < catB) return -1;
      if (catA > catB) return 1;
      // Secondary sort by name
      if (a.exercise.name.toLowerCase() < b.exercise.name.toLowerCase()) return -1;
      if (a.exercise.name.toLowerCase() > b.exercise.name.toLowerCase()) return 1;
      return 0;
    });
    setExercises(sorted);
    try {
      await fetch(`/api/routines/${routineId}/reorder`, {
        method: "POST",
        body: JSON.stringify({ routineExerciseIds: sorted.map(e => e.id) }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Failed to reorder", e);
    }
  };

  const toggleSuperset = async (id: string, currentStatus: boolean) => {
    const newExercises = exercises.map(e => e.id === id ? { ...e, isSuperset: !currentStatus } : e);
    setExercises(newExercises);
    try {
      await fetch(`/api/routine-exercises`, {
        method: "PATCH",
        body: JSON.stringify({ id, isSuperset: !currentStatus }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Failed to toggle superset", e);
    }
  };

  const handleRemove = (id: string) => {
    setDeleteAlert({ open: true, id });
  };

  const confirmRemove = async () => {
    if (!deleteAlert.id) return;
    try {
      await fetch(`/api/routine-exercises?id=${deleteAlert.id}`, {
        method: "DELETE",
      });
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to remove exercise", error);
    } finally {
      setDeleteAlert({ open: false, id: null });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight capitalize">{routineName}</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsRenaming(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">{exercises.length} exercises</p>
          {focusedParts.length > 0 && (
            <div className="flex gap-1 mt-1">
              {focusedParts.map(p => (
                <span key={p} className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{p}</span>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSortByCategory}>
              <ListOrdered className="w-4 h-4" /> Sort by Category
            </Button>
          </div>
        </div>

        <ExerciseSelector
          onSelect={handleAdd}
          selectedExerciseIds={exercises.map(e => e.exerciseId)}
          preferredCategories={focusedParts}
        />
      </div>

      <div className="space-y-4">
        {exercises.map((re, index) => (
          <Card key={re.id} className="overflow-hidden">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-muted-foreground text-sm shrink-0">
                  {index + 1}
                </div>
                {re.exercise.imageUrl && (
                  <img src={re.exercise.imageUrl} alt={re.exercise.name} className="w-12 h-12 rounded object-cover border shrink-0" />
                )}
                <div>
                  <h3 className="font-bold line-clamp-1 capitalize">{re.exercise.name}</h3>
                  <div className="flex gap-1 items-center mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded capitalize">
                      {re.exercise.category?.toLowerCase() || 'other'}
                    </span>
                    {re.exercise.target && re.exercise.target !== re.exercise.category && (
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded capitalize">
                        {re.exercise.target.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`text-xs px-2 py-0.5 rounded cursor-pointer select-none transition-colors border mr-2 ${(re as any).isSuperset
                    ? "bg-amber-400 border-amber-400 text-white font-semibold"
                    : "bg-transparent border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                    }`}
                  onClick={() => toggleSuperset(re.id, (re as any).isSuperset)}
                >
                  Superset
                </div>
                <div className="flex flex-col mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === exercises.length - 1}
                    onClick={() => handleMove(index, 'down')}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemove(re.id)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
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

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Routine</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">Categories</Label>
              <div className="col-span-3 space-y-3">
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableCategories.length === 0 && (
                    <span className="text-sm text-muted-foreground">Loading categories...</span>
                  )}
                  {availableCategories.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded capitalize">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCategories.map(cat => (
                      <Badge key={cat} variant="secondary" className="capitalize text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRename}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlert.open} onOpenChange={(open) => !open && setDeleteAlert(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Exercise?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this exercise from the routine?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
