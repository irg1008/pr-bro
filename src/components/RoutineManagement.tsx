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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { Routine } from "prisma/generated/client";
import React, { useEffect, useState } from "react";
import { DeloadBadge } from "./ui/DeloadBadge";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

type RoutineWithCount = Routine & { exerciseCount: number };

interface RoutineManagementProps {
  groupId: string;
  groupName: string;
  groupDescription?: string | null;
  isActive?: boolean;
  routines?: RoutineWithCount[];
}

export const RoutineManagement: React.FC<RoutineManagementProps> = ({
  groupId,
  groupName,
  groupDescription,
  isActive = false,
  routines: initialRoutines = []
}) => {
  const [routines, setRoutines] = useState<RoutineWithCount[]>(initialRoutines);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [editingRoutine, setEditingRoutine] = useState<RoutineWithCount | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);

  // Group Edit State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupDesc, setEditingGroupDesc] = useState("");

  const handleUpdateGroup = async () => {
    if (!editingGroupName.trim()) return;
    const { error } = await actions.routine.updateGroup({
      id: groupId,
      name: editingGroupName,
      description: editingGroupDesc
    });
    if (!error) {
      setIsEditingGroup(false);
      navigate(location.pathname);
    }
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await actions.exercise.getCategories();
      if (!error && data) setAvailableCategories(data);
    })();
  }, []);

  const handleCreate = async () => {
    if (newName.trim()) {
      const { data, error } = await actions.routine.createRoutine({
        name: newName,
        description: newDesc,
        routineGroupId: groupId,
        focusedParts: selectedCategories
      });
      if (!error && data) {
        setNewName("");
        setNewDesc("");
        setSelectedCategories([]);
        setIsCreating(false);
        setRoutines((prev) => [...prev, { ...data, exerciseCount: 0 }]);
      }
    }
  };

  const handleEdit = async () => {
    if (!editingRoutine || !editName.trim()) return;
    const { data, error } = await actions.routine.updateRoutine({
      id: editingRoutine.id,
      name: editName,
      description: editDesc,
      focusedParts: editCategories
    });
    if (!error && data) {
      setEditingRoutine(null);
      setRoutines((prev) =>
        prev.map((r) => (r.id === data.id ? { ...data, exerciseCount: r.exerciseCount } : r))
      );
    }
  };

  const openEdit = (routine: RoutineWithCount, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoutine(routine);
    setEditName(routine.name);
    setEditDesc(routine.description || "");
    setEditCategories(routine.focusedParts || []);
  };

  const handleDelete = async (routineId: string) => {
    const { error } = await actions.routine.deleteRoutine({ id: routineId });
    if (!error) {
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    }
  };

  const handleSelectRoutine = (routineId: string) => {
    navigate(`/routines/${groupId}/${routineId}`);
  };

  const toggleCategory = (category: string, isEdit: boolean = false) => {
    const setFn = isEdit ? setEditCategories : setSelectedCategories;
    setFn((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  };

  const handleMove = async (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === routines.length - 1) return;

    const newRoutines = [...routines];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    [newRoutines[index], newRoutines[targetIndex]] = [newRoutines[targetIndex], newRoutines[index]];

    setRoutines(newRoutines);
    await actions.routine.reorderRoutines({ routineIds: newRoutines.map((r) => r.id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight capitalize">{groupName}</h2>
            {isActive && <Badge className="bg-accent">Active</Badge>}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary h-8 w-8"
              onClick={() => {
                setEditingGroupName(groupName);
                setEditingGroupDesc(groupDescription || "");
                setIsEditingGroup(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            {groupDescription || "Manage your routines for this group."}
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>New routine</Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create routine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Push Day"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                placeholder="Focus on chest, shoulders, triceps"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label>Focused parts / Categories</Label>
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

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate}>Save routine</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routines.map((routine, index) => (
          <Card
            key={routine.id}
            className="group border-border/40 hover:bg-card/50 relative cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            onClick={() => handleSelectRoutine(routine.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-bold capitalize">{routine.name}</CardTitle>
              <div className="flex items-center gap-1">
                <AlertDialog>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary z-10 h-8 w-8"
                      onClick={(e) => openEdit(routine, e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive z-10 h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the routine "
                        {routine.name}" and all associated workout history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(routine.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Mobile: Vertical Up/Down */}
                <div className="mr-1 flex flex-col gap-0.5 md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={(e) => handleMove(index, "up", e)}
                    title="Move Up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === routines.length - 1}
                    onClick={(e) => handleMove(index, "down", e)}
                    title="Move Down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                {/* Desktop: Horizontal Left/Right */}
                <div className="mr-1 hidden gap-0.5 md:flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={(e) => handleMove(index, "up", e)}
                    title="Move Previous"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === routines.length - 1}
                    onClick={(e) => handleMove(index, "down", e)}
                    title="Move Next"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {routine.description || "No description"}
              </p>

              {routine.focusedParts && routine.focusedParts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {routine.focusedParts.map((part) => (
                    <span
                      key={part}
                      className="bg-secondary/50 text-muted-foreground rounded px-1.5 py-0.5 text-[10px] capitalize"
                    >
                      {part}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-muted-foreground mt-4 text-xs font-medium">
                {routine.exerciseCount} Exercises
              </div>

              {routine.isDeload && <DeloadBadge className="absolute top-2 right-2" />}
            </CardContent>
          </Card>
        ))}
        {routines.length === 0 && !isCreating && (
          <div className="text-muted-foreground col-span-full rounded-lg border-2 border-dashed p-8 text-center">
            No routines found in this group. Create one to get started!
          </div>
        )}
      </div>

      <Dialog open={!!editingRoutine} onOpenChange={(open) => !open && setEditingRoutine(null)}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Edit routine</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label>Focused parts / Categories</Label>
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
                      checked={editCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat, true)}
                    />
                    <span className="text-sm leading-none font-medium">{cat}</span>
                  </label>
                ))}
              </div>
              {editCategories.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {editCategories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs capitalize">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoutine(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingGroup} onOpenChange={setIsEditingGroup}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Edit routine group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={editingGroupName}
                onChange={(e) => setEditingGroupName(e.target.value)}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="group-desc">Description</Label>
              <Input
                id="group-desc"
                value={editingGroupDesc}
                onChange={(e) => setEditingGroupDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingGroup(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
