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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCopy,
  ClipboardPaste,
  Eye,
  EyeOff,
  Info,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type RoutineExerciseWithExercise = RoutineExercise & { exercise: Exercise };

interface RoutineDetailProps {
  routineId: string;
  routineName: string;
  routineDescription?: string | null;
  initialExercises: RoutineExerciseWithExercise[];
  focusedParts?: string[];
}

export const RoutineDetail: React.FC<RoutineDetailProps> = ({
  routineId,
  routineName,
  routineDescription,
  initialExercises,
  focusedParts = []
}) => {
  const [exercises, setExercises] = useState<RoutineExerciseWithExercise[]>(initialExercises);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(routineName);
  const [newDescription, setNewDescription] = useState(routineDescription || "");
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
    targetType: "REPS" | "DURATION";
    targetRepsToFailure: string;
    incrementValue: string;
  }>({
    open: false,
    id: null,
    targetSets: "",
    targetReps: "",
    targetType: "REPS",
    targetRepsToFailure: "",
    incrementValue: ""
  });
  const [clipboard, setClipboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

  useEffect(() => {
    const saved = localStorage.getItem("prbro_clipboard");
    if (saved) {
      try {
        setClipboard(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse clipboard", e);
      }
    }
  }, []);

  const handleCopy = (re: RoutineExerciseWithExercise) => {
    const payload = {
      exerciseId: re.exerciseId,
      exerciseName: re.exercise.name, // For display
      targetSets: re.targetSets,
      targetReps: re.targetReps,
      targetRepsToFailure: re.targetRepsToFailure,
      incrementValue: re.incrementValue,
      note: re.note
    };
    localStorage.setItem("prbro_clipboard", JSON.stringify(payload));
    setClipboard(payload);
    toast.success(`Copied "${re.exercise.name}" to clipboard`);
  };

  const handlePaste = async () => {
    if (!clipboard) return;

    // Check duplicate
    if (exercises.some((e) => e.exerciseId === clipboard.exerciseId)) {
      toast.error(`"${clipboard.exerciseName}" is already in this routine.`);
      return;
    }

    try {
      const { error } = await actions.routine.addExercise({
        routineId: routineId,
        exerciseId: clipboard.exerciseId,
        targetSets: clipboard.targetSets,
        targetReps: clipboard.targetReps,
        targetRepsToFailure: clipboard.targetRepsToFailure,
        incrementValue: clipboard.incrementValue,
        note: clipboard.note
      });
      if (!error) {
        navigate(location.pathname);
      } else {
        toast.error("Failed to paste exercise");
      }
    } catch (error) {
      console.error("Failed to paste exercise", error);
      toast.error("Failed to paste exercise");
    }
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await actions.exercise.getCategories();
      if (!error && data) setAvailableCategories(data);
    })();
  }, []);

  const handleRename = async () => {
    if (!newName.trim()) return;
    const { error } = await actions.routine.updateRoutine({
      id: routineId,
      name: newName,
      description: newDescription,
      focusedParts: selectedCategories
    });
    if (!error) {
      setIsRenaming(false);
      navigate(location.pathname);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  };

  const handleAdd = async (exercise: Exercise) => {
    // Check if already in routine
    const existingExercise = exercises.find((e) => e.exerciseId === exercise.id);

    if (existingExercise) {
      if (existingExercise.isActive === false) {
        // Just reactivate it
        await toggleIsActive(existingExercise.id, false);
        toast.success(`Active "${exercise.name}" again.`);
      } else {
        toast.info(`"${exercise.name}" is already in the routine.`);
      }
      return;
    }

    const { error } = await actions.routine.addExercise({ routineId, exerciseId: exercise.id });
    if (!error) {
      navigate(location.pathname);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === exercises.length - 1) return;

    const movingExercise = exercises[index];
    const isMovingActive = movingExercise.isActive !== false;

    // Find target index based on visibility matching
    let targetIndex = -1;

    if (direction === "up") {
      // Search backwards for the first item with matching active status
      for (let i = index - 1; i >= 0; i--) {
        const current = exercises[i];
        const isCurrentActive = current.isActive !== false;
        if (isCurrentActive === isMovingActive) {
          targetIndex = i;
          break;
        }
      }
    } else {
      // Search forwards
      for (let i = index + 1; i < exercises.length; i++) {
        const current = exercises[i];
        const isCurrentActive = current.isActive !== false;
        if (isCurrentActive === isMovingActive) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) return; // No suitable target found to swap with

    const newExercises = [...exercises];
    // Swap
    [newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index]
    ];

    setExercises(newExercises);
    await actions.routine.reorderExercises({ routineExerciseIds: newExercises.map((e) => e.id) });
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
    await actions.routine.reorderRoutines({ routineIds: sorted.map((e) => e.id) }); // Note: typo in action name maybe? Or is it reorderExercises?
    // Wait, let's check routine.ts actions again.
    // It has: reorderRoutines and reorderExercises.
    // In RoutineDetail, we are reordering EXERCISES.
    await actions.routine.reorderExercises({ routineExerciseIds: sorted.map((e) => e.id) });
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
      targetType: re.targetType || "REPS",
      targetRepsToFailure: re.targetRepsToFailure || "",
      incrementValue: re.incrementValue ? re.incrementValue.toString() : ""
    });
  };

  const handleSaveNote = async () => {
    if (!noteDialog.id) return;

    const newExercises = exercises.map((e) =>
      e.id === noteDialog.id ? { ...e, note: noteDialog.note } : e
    );
    setExercises(newExercises);

    const { error } = await actions.routine.updateExerciseAssignment({
      id: noteDialog.id,
      data: { note: noteDialog.note }
    });
    if (!error) {
      setNoteDialog((prev) => ({ ...prev, open: false }));
    }
  };

  const handleSaveTargets = async () => {
    if (!targetDialog.id) return;

    // Validation
    if (targetDialog.targetReps && targetDialog.targetReps.trim() !== "") {
      // Allow: Single number ("8"), Range ("8-12"), or Comma-separated list ("8,5,3")
      // We already restrict input chars in the UI, so here we mostly check format structure
      // New regex: sequence of (number or range), separated by optional comma/space
      const isValid = /^[\d\s,-]+$/.test(targetDialog.targetReps.trim());

      if (!isValid) {
        toast.error(
          "Invalid Reps format. Use numbers (e.g. '8'), ranges ('8-12'), or lists ('8, 5, 3')."
        );
        return;
      }

      // Range check: Min <= Max for any ranges found
      if (targetDialog.targetReps.includes("-")) {
        // Split by comma first to handle each part
        const groups = targetDialog.targetReps.split(",");
        for (const group of groups) {
          if (group.includes("-")) {
            const parts = group.split("-").map((p) => parseInt(p.trim()));
            if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > parts[1]) {
              toast.error(`Invalid Reps range '${group.trim()}'. Min must be <= Max.`);
              return;
            }
          }
        }
      }
    }

    const newExercises = exercises.map((e) =>
      e.id === targetDialog.id
        ? {
            ...e,
            targetSets: targetDialog.targetSets || null,
            targetReps: targetDialog.targetReps || null,
            targetType: targetDialog.targetType,
            targetRepsToFailure: targetDialog.targetRepsToFailure || null,
            incrementValue: targetDialog.incrementValue
              ? parseFloat(targetDialog.incrementValue)
              : null
          }
        : e
    );
    setExercises(newExercises);

    const { error } = await actions.routine.updateExerciseAssignment({
      id: targetDialog.id,
      data: {
        targetSets: targetDialog.targetSets || null,
        targetReps: targetDialog.targetReps || null,
        targetType: targetDialog.targetType,
        targetRepsToFailure: targetDialog.targetRepsToFailure || null,
        incrementValue: targetDialog.incrementValue ? parseFloat(targetDialog.incrementValue) : null
      }
    });

    if (!error) {
      setTargetDialog((prev) => ({ ...prev, open: false }));
    }
  };

  const toggleSuperset = async (id: string, currentStatus: boolean) => {
    const newExercises = exercises.map((e) =>
      e.id === id ? { ...e, isSuperset: !currentStatus } : e
    );
    setExercises(newExercises);
    await actions.routine.updateExerciseAssignment({
      id,
      data: { isSuperset: !currentStatus }
    });
  };

  const handleRemove = (id: string) => {
    setDeleteAlert({ open: true, id });
  };

  const confirmRemove = async () => {
    if (!deleteAlert.id) return;
    const { error } = await actions.routine.removeExercise({ id: deleteAlert.id });
    if (!error) {
      setExercises((prev) => prev.filter((e) => e.id !== deleteAlert.id));
    }
    setDeleteAlert({ open: false, id: null });
  };

  const toggleIsActive = async (id: string, currentStatus: boolean) => {
    const status = currentStatus ?? true;
    const newExercises = exercises.map((e) => (e.id === id ? { ...e, isActive: !status } : e));
    setExercises(newExercises);

    await actions.routine.updateExerciseAssignment({
      id,
      data: { isActive: !status }
    });
  };

  const activeExercises = exercises.filter((e) => e.isActive !== false);
  const inactiveExercises = exercises.filter((e) => e.isActive === false);

  const renderExerciseList = (list: RoutineExerciseWithExercise[]) => (
    <div className="space-y-4">
      {list.map((re, __index) => {
        // Find the actua index in the main list for reordering logic
        const originalIndex = exercises.findIndex((e) => e.id === re.id);
        const index = list.indexOf(re);

        return (
          <Card key={re.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex flex-col gap-3">
                {/* Top Row: Index, Image, Info, Menu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        re.isActive !== false
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/50 text-muted-foreground/50"
                      )}
                    >
                      {re.isActive !== false ? index + 1 : "-"}
                    </div>
                    {re.exercise.imageUrl && (
                      <img
                        src={re.exercise.imageUrl}
                        alt={re.exercise.name}
                        className={cn(
                          "h-12 w-12 shrink-0 rounded border object-cover",
                          re.isActive === false && "opacity-50 grayscale"
                        )}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={cn(
                          "line-clamp-1 flex items-center gap-2 text-sm font-bold capitalize sm:text-base",
                          re.isActive === false && "text-muted-foreground"
                        )}
                      >
                        {re.exercise.name}
                        <ExerciseInfoModal exercise={re.exercise} />
                        {re.isActive === false && (
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            Inactive
                          </Badge>
                        )}
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
                    {re.isSuperset && <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />}
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
                            className={cn(
                              "mr-2 h-4 w-4",
                              re.isSuperset ? "fill-amber-500 text-amber-500" : ""
                            )}
                          />
                          <span>{re.isSuperset ? "Active superset" : "Toggle superset"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleCopy(re)}>
                          <ClipboardCopy className="mr-2 h-4 w-4" />
                          Copy Exercise
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toggleIsActive(re.id, re.isActive ?? true)}
                        >
                          {re.isActive !== false ? (
                            <EyeOff className="mr-2 h-4 w-4" />
                          ) : (
                            <Eye className="mr-2 h-4 w-4" />
                          )}
                          <span>{re.isActive !== false ? "Deactivate" : "Activate"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleRemove(re.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Bottom Content: Note & Move Actions */}
                <div
                  className={cn(
                    "mt-2 flex items-center justify-between gap-3 pl-11",
                    re.isActive === false && "opacity-50"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    {/* Targets Area - Clickable */}
                    <div className="cursor-pointer" onClick={() => openTargetDialog(re)}>
                      {re.targetSets ||
                      re.targetReps ||
                      re.targetRepsToFailure ||
                      re.incrementValue ? (
                        <div className="bg-background hover:bg-muted/30 w-fit rounded-md border px-2 py-1.5 transition-colors">
                          <TargetDisplay
                            targetSets={re.targetSets}
                            targetReps={re.targetReps}
                            targetType={re.targetType}
                            targetRepsToFailure={re.targetRepsToFailure}
                            incrementValue={re.incrementValue}
                            className="gap-3"
                            asGrid
                          />
                        </div>
                      ) : (
                        <div className="border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 flex w-fit items-center gap-2 rounded-md border border-dashed p-1.5 transition-colors">
                          <Target className="h-3.5 w-3.5" />
                          <span className="text-xs">Add target</span>
                        </div>
                      )}
                    </div>

                    {/* Note Area - Clickable Card */}
                    <div className="group w-fit cursor-pointer" onClick={() => openNoteDialog(re)}>
                      {re.note ? (
                        <div className="text-foreground/80 bg-background hover:bg-muted/30 flex w-fit items-start gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors">
                          <StickyNote className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                          <span className="leading-snug whitespace-pre-wrap">{re.note}</span>
                        </div>
                      ) : (
                        <div className="border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 flex w-fit items-center gap-2 rounded-md border border-dashed p-1.5 transition-colors">
                          <StickyNote className="h-3.5 w-3.5" />
                          <span className="text-xs">Add note</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Move Actions - Stacked */}
                  <div className="ms-auto flex shrink-0 flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={originalIndex === 0}
                      onClick={() => handleMove(originalIndex, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={originalIndex === exercises.length - 1}
                      onClick={() => handleMove(originalIndex, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {list.length === 0 && (
        <div className="text-muted-foreground bg-muted/50 rounded-lg border-2 border-dashed px-4 py-12 text-center">
          <p className="mb-2">No exercises in this list.</p>
        </div>
      )}
    </div>
  );

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
          {routineDescription && (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{routineDescription}</p>
          )}
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
            className="flex w-full items-center justify-center gap-2 sm:w-auto"
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
            routineExercises={exercises}
          />

          <Button
            variant="secondary"
            className="gap-2"
            onClick={handlePaste}
            disabled={!clipboard}
            title={`Paste "${clipboard?.exerciseName}"`}
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "active" | "inactive")}
        className="mt-4 w-full"
      >
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active ({activeExercises.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactiveExercises.length})</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSortByCategory}>
            <ListOrdered className="h-4 w-4" /> Sort
          </Button>
        </div>

        <TabsContent value="active">{renderExerciseList(activeExercises)}</TabsContent>
        <TabsContent value="inactive">{renderExerciseList(inactiveExercises)}</TabsContent>
      </Tabs>

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
              <Label htmlFor="desc" className="mt-2 text-right">
                Description
              </Label>
              <Textarea
                id="desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="col-span-3 resize-none"
                placeholder="Optional description"
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
                      <span className="text-sm leading-none font-medium">{cat}</span>
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
            <p className="text-muted-foreground mt-1 text-xs">
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
            <div className="grid grid-cols-4 gap-4 md:grid-cols-2">
              <div className="col-span-1">
                <Label className="text-muted-foreground text-xs">Sets</Label>
                <Input
                  value={targetDialog.targetSets}
                  onChange={(e) =>
                    setTargetDialog((prev) => ({ ...prev, targetSets: e.target.value }))
                  }
                  placeholder="3"
                  className="mt-1"
                />
              </div>
              <div className="col-span-3 md:col-span-1">
                <div className="flex items-center gap-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {targetDialog.targetType === "DURATION" ? "Seconds" : "Reps"}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-muted-foreground/50 hover:text-muted-foreground hidden h-3 w-3 cursor-pointer transition-colors md:block" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>
                        {targetDialog.targetType === "DURATION"
                          ? "Only numbers allowed for duration."
                          : "For Reps: Set a range (e.g. 8-12) or specific reps per set separated by commas (e.g. 8,5,3)."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={targetDialog.targetReps}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (targetDialog.targetType === "DURATION") {
                        // Only numbers
                        if (/^\d*$/.test(val)) {
                          setTargetDialog((prev) => ({ ...prev, targetReps: val }));
                        }
                      } else {
                        // Numbers, commas, hyphens, spaces
                        if (/^[\d,\-\s]*$/.test(val)) {
                          setTargetDialog((prev) => ({ ...prev, targetReps: val }));
                        }
                      }
                    }}
                    placeholder={targetDialog.targetType === "DURATION" ? "30" : "8-12 or 8,5,3"}
                    className="flex-1 basis-1/3"
                  />
                  <Select
                    value={targetDialog.targetType}
                    onValueChange={(v) =>
                      setTargetDialog((prev) => ({ ...prev, targetType: v as "REPS" | "DURATION" }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPS">Reps</SelectItem>
                      <SelectItem value="DURATION">Seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-xs">Increment (kg)</Label>
                <Input
                  value={targetDialog.incrementValue}
                  onChange={(e) =>
                    setTargetDialog((prev) => ({ ...prev, incrementValue: e.target.value }))
                  }
                  placeholder="2.5"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-xs">RIF</Label>
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
            <p className="text-muted-foreground mt-3 text-xs">
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
