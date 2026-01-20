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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { navigate } from "astro:transitions/client";
import {
  ArrowDown,
  ArrowUp,
  ListOrdered,
  MoreVertical,
  Pencil,
  Plus,
  StickyNote,
  Target,
  Trash2,
  Zap
} from "lucide-react";
import type { Exercise, RoutineExercise } from "prisma/generated/client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { TargetDisplay } from "./TargetDisplay";
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
  focusedParts = []
}) => {
  const [exercises, setExercises] = useState<RoutineExerciseWithExercise[]>(initialExercises);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(routineName);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(focusedParts);
  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null
  });
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    id: string | null;
    note: string;
  }>({
    open: false,
    id: null,
    note: ""
  });
  const [targetDialog, setTargetDialog] = useState<{
    open: boolean;
    id: string | null;
    targetSets: string;
    targetReps: string;
    targetRepsToFailure: string;
    incrementValue: string;
  }>({
    open: false,
    id: null,
    targetSets: "",
    targetReps: "",
    targetRepsToFailure: "",
    incrementValue: "2.5"
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: string[]) => {
        setAvailableCategories(data);
      })
      .catch((err) => console.error("Failed to fetch categories", err));
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
        headers: { "Content-Type": "application/json" }
      });
      setIsRenaming(false);
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to rename", error);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  };

  const handleAdd = async (exercise: Exercise) => {
    try {
      await fetch("/api/routine-exercises", {
        method: "POST",
        body: JSON.stringify({ routineId: routineId, exerciseId: exercise.id }),
        headers: { "Content-Type": "application/json" }
      });
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to add exercise", error);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === exercises.length - 1) return;

    const newExercises = [...exercises];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap
    [newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index]
    ];

    setExercises(newExercises);

    try {
      await fetch(`/api/routines/${routineId}/reorder`, {
        method: "POST",
        body: JSON.stringify({ routineExerciseIds: newExercises.map((e) => e.id) }),
        headers: { "Content-Type": "application/json" }
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
        body: JSON.stringify({ routineExerciseIds: sorted.map((e) => e.id) }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("Failed to reorder", e);
    }
  };

  const openNoteDialog = (re: RoutineExerciseWithExercise) => {
    setNoteDialog({
      open: true,
      id: re.id,
      note: re.note || ""
    });
  };

  const openTargetDialog = (re: RoutineExerciseWithExercise) => {
    setTargetDialog({
      open: true,
      id: re.id,
      targetSets: re.targetSets || "",
      targetReps: re.targetReps || "",
      targetRepsToFailure: re.targetRepsToFailure || "",
      incrementValue: re.incrementValue ? re.incrementValue.toString() : "2.5"
    });
  };

  const handleSaveNote = async () => {
    if (!noteDialog.id) return;

    const newExercises = exercises.map((e) =>
      e.id === noteDialog.id ? { ...e, note: noteDialog.note } : e
    );
    setExercises(newExercises as RoutineExerciseWithExercise[]);

    try {
      await fetch(`/api/routine-exercises`, {
        method: "PATCH",
        body: JSON.stringify({ id: noteDialog.id, note: noteDialog.note }),
        headers: { "Content-Type": "application/json" }
      });
      setNoteDialog((prev) => ({ ...prev, open: false }));
    } catch (e) {
      console.error("Failed to save note", e);
    }
  };

  const handleSaveTargets = async () => {
    if (!targetDialog.id) return;

    // Validation
    if (targetDialog.targetReps && targetDialog.targetReps.trim() !== "") {
      // Regex: 'X' or 'X-Y' where X,Y are numbers.
      const isValid = /^\d+(-\d+)?$/.test(targetDialog.targetReps.trim());
      if (!isValid) {
        toast.error(
          "Invalid Reps format. Use a single number (e.g. '8') or a range (e.g. '8-12')."
        );
        return;
      }

      // Range check: Min <= Max
      if (targetDialog.targetReps.includes("-")) {
        const parts = targetDialog.targetReps.split("-").map((p) => parseInt(p.trim()));
        if (parts[0] > parts[1]) {
          toast.error("Invalid Reps range. Min must be <= Max (e.g. '8-12').");
          return;
        }
      }
    }

    const newExercises = exercises.map((e) =>
      e.id === targetDialog.id
        ? {
            ...e,
            targetSets: targetDialog.targetSets || null,
            targetReps: targetDialog.targetReps || null,
            targetRepsToFailure: targetDialog.targetRepsToFailure || null,
            incrementValue: targetDialog.incrementValue
              ? parseFloat(targetDialog.incrementValue)
              : 2.5
          }
        : e
    );
    setExercises(newExercises as RoutineExerciseWithExercise[]);

    try {
      await fetch(`/api/routine-exercises`, {
        method: "PATCH",
        body: JSON.stringify({
          id: targetDialog.id,
          targetSets: targetDialog.targetSets || null,
          targetReps: targetDialog.targetReps || null,
          targetRepsToFailure: targetDialog.targetRepsToFailure || null,
          incrementValue: targetDialog.incrementValue
        }),
        headers: { "Content-Type": "application/json" }
      });
      setTargetDialog((prev) => ({ ...prev, open: false }));
    } catch (e) {
      console.error("Failed to save targets", e);
    }
  };

  const toggleSuperset = async (id: string, currentStatus: boolean) => {
    const newExercises = exercises.map((e) =>
      e.id === id ? { ...e, isSuperset: !currentStatus } : e
    );
    setExercises(newExercises);
    try {
      await fetch(`/api/routine-exercises`, {
        method: "PATCH",
        body: JSON.stringify({ id, isSuperset: !currentStatus }),
        headers: { "Content-Type": "application/json" }
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
        method: "DELETE"
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight capitalize">{routineName}</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsRenaming(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">{exercises.length} exercises</p>
          {focusedParts.length > 0 && (
            <div className="mt-1 flex gap-1">
              {focusedParts.map((p) => (
                <span
                  key={p}
                  className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 text-xs"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full gap-2 sm:w-auto flex items-center justify-center"
            onClick={async () => {
              const returnUrl = encodeURIComponent(window.location.pathname);
              await navigate(
                `/exercises/create?returnUrl=${returnUrl}&addToRoutineId=${routineId}`
              );
            }}
          >
            <Plus className="h-4 w-4" /> Create custom exercise
          </Button>
          <ExerciseSelector
            onSelect={handleAdd}
            selectedExerciseIds={exercises.map((e) => e.exerciseId)}
            preferredCategories={focusedParts}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleSortByCategory}>
          <ListOrdered className="h-4 w-4" /> Sort by category
        </Button>
      </div>
      <div className="space-y-4">
        {exercises.map((re, index) => (
          <Card key={re.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex flex-col gap-3">
                {/* Top Row: Index, Image, Info, Menu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold mt-1">
                      {index + 1}
                    </div>
                    {re.exercise.imageUrl && (
                      <img
                        src={re.exercise.imageUrl}
                        alt={re.exercise.name}
                        className="h-12 w-12 shrink-0 rounded border object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 font-bold capitalize flex items-center gap-2 text-sm sm:text-base">
                        {re.exercise.name}
                        <ExerciseInfoModal exercise={re.exercise} />
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="text-muted-foreground bg-secondary rounded px-1.5 py-0.5 text-[10px] capitalize">
                          {re.exercise.category?.toLowerCase() || "other"}
                        </span>
                        {re.exercise.target && re.exercise.target !== re.exercise.category && (
                          <span className="text-muted-foreground bg-secondary rounded px-1.5 py-0.5 text-[10px] capitalize">
                            {re.exercise.target.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu always on top right */}
                  <div className="flex items-center gap-1">
                    {re.isSuperset && <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => toggleSuperset(re.id, re.isSuperset)}>
                          <Zap
                            className={`mr-2 h-4 w-4 ${re.isSuperset ? "text-amber-500 fill-amber-500" : ""}`}
                          />
                          <span>{re.isSuperset ? "Active Superset" : "Toggle Superset"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleRemove(re.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Exercise
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Bottom Content: Note & Move Actions */}
                <div className="flex items-center justify-between gap-3 pl-11 mt-2">
                  <div className="flex gap-2 flex-col">
                    {/* Targets Area - Clickable */}
                    <div className="cursor-pointer" onClick={() => openTargetDialog(re)}>
                      {re.targetSets ||
                      re.targetReps ||
                      re.targetRepsToFailure ||
                      re.incrementValue ? (
                        <div className="bg-background px-2 py-1.5 rounded-md border hover:bg-muted/30 transition-colors w-fit">
                          <TargetDisplay
                            targetSets={re.targetSets}
                            targetReps={re.targetReps}
                            targetRepsToFailure={re.targetRepsToFailure}
                            incrementValue={re.incrementValue}
                            className="gap-3"
                            asGrid
                          />
                        </div>
                      ) : (
                        <div className="border border-dashed border-muted-foreground/30 rounded-md p-1.5 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors w-fit">
                          <Target className="h-3.5 w-3.5" />
                          <span className="text-xs">Add target</span>
                        </div>
                      )}
                    </div>

                    {/* Note Area - Clickable Card */}
                    <div className="cursor-pointer group w-fit" onClick={() => openNoteDialog(re)}>
                      {re.note ? (
                        <div className="text-sm text-foreground/80 bg-background px-2 py-1.5 rounded-md flex items-start gap-2 border hover:bg-muted/30 transition-colors w-fit">
                          <StickyNote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <span className="leading-snug line-clamp-2">{re.note}</span>
                        </div>
                      ) : (
                        <div className="border border-dashed border-muted-foreground/30 rounded-md p-1.5 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors w-fit">
                          <StickyNote className="h-3.5 w-3.5" />
                          <span className="text-xs">Add note</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Move Actions - Stacked */}
                  <div className="flex flex-col ms-auto gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === exercises.length - 1}
                      onClick={() => handleMove(index, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {exercises.length === 0 && (
          <div className="text-muted-foreground bg-muted/50 rounded-lg border-2 border-dashed px-4 py-12 text-center">
            <p className="mb-2">No exercises in this routine yet.</p>
            <p className="text-sm">Click "Add exercise" to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename routine</DialogTitle>
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
              <Label className="mt-2 text-right">Categories</Label>
              <div className="col-span-3 space-y-3">
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                  {availableCategories.length === 0 && (
                    <span className="text-muted-foreground text-sm">Loading categories...</span>
                  )}
                  {availableCategories.map((cat) => (
                    <label
                      key={cat}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 capitalize transition-colors"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                      />
                      <span className="text-sm font-medium leading-none">{cat}</span>
                    </label>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs capitalize">
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

      <AlertDialog
        open={deleteAlert.open}
        onOpenChange={(open) => !open && setDeleteAlert((prev) => ({ ...prev, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this exercise from the routine?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => setNoteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exercise note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Instruction / Note</Label>
            <Textarea
              value={noteDialog.note}
              onChange={(e) => setNoteDialog((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="e.g. Use the wide grip bar, seat setting 4..."
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This note will be shown every time you perform this exercise.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={targetDialog.open}
        onOpenChange={(open) => setTargetDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Set targets
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Sets</Label>
                <Input
                  value={targetDialog.targetSets}
                  onChange={(e) =>
                    setTargetDialog((prev) => ({ ...prev, targetSets: e.target.value }))
                  }
                  placeholder="3"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reps</Label>
                <Input
                  value={targetDialog.targetReps}
                  onChange={(e) =>
                    setTargetDialog((prev) => ({ ...prev, targetReps: e.target.value }))
                  }
                  placeholder="8-12"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Increment (kg)</Label>
                <Input
                  value={targetDialog.incrementValue}
                  onChange={(e) =>
                    setTargetDialog((prev) => ({ ...prev, incrementValue: e.target.value }))
                  }
                  placeholder="2.5"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">RIF</Label>
                <Input
                  value={targetDialog.targetRepsToFailure}
                  onChange={(e) =>
                    setTargetDialog((prev) => ({ ...prev, targetRepsToFailure: e.target.value }))
                  }
                  placeholder="1-2"
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              RIF = Reps In Reserve (reps before failure)
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTargetDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTargets}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
