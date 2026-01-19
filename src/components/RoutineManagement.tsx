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
import { Label } from "@/components/ui/label";
import { navigate } from "astro:transitions/client";
import { Pencil, Trash2 } from "lucide-react";
import type { Routine } from "prisma/generated/client";
import React, { useEffect, useState } from 'react';
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
  routines = [],
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [editingRoutine, setEditingRoutine] = useState<RoutineWithCount | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);

  // Group Edit State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupDesc, setEditingGroupDesc] = useState('');

  const handleUpdateGroup = async () => {
    if (!editingGroupName.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingGroupName,
          description: editingGroupDesc,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setIsEditingGroup(false);
        navigate(location.pathname);
      }
    } catch (error) {
      console.error("Failed to update group", error);
    }
  };

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: string[]) => {
        // API now returns string[] directly
        setAvailableCategories(data);
      })
      .catch(err => console.error("Failed to fetch categories", err));
  }, []);

  const handleCreate = async () => {
    if (newName.trim()) {
      try {
        const res = await fetch("/api/routines", {
          method: "POST",
          body: JSON.stringify({
            name: newName,
            description: newDesc,
            routineGroupId: groupId,
            focusedParts: selectedCategories
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          setNewName('');
          setNewDesc('');
          setSelectedCategories([]);
          setIsCreating(false);
          navigate(location.pathname);
        }
      } catch (error) {
        console.error("Failed to create routine", error);
      }
    }
  };

  const handleEdit = async () => {
    if (!editingRoutine || !editName.trim()) return;
    try {
      const res = await fetch(`/api/routines/${editingRoutine.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          focusedParts: editCategories
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setEditingRoutine(null);
        navigate(location.pathname);
      }
    } catch (error) {
      console.error("Failed to update routine", error);
    }
  };

  const openEdit = (routine: RoutineWithCount, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoutine(routine);
    setEditName(routine.name);
    setEditDesc(routine.description || '');
    setEditCategories(routine.focusedParts || []);
  };

  const handleDelete = async (routineId: string) => {
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        navigate(location.pathname);
      }
    } catch (error) {
      console.error("Failed to delete routine", error);
    }
  }

  const handleSelectRoutine = (routineId: string) => {
    navigate(`/routines/${groupId}/${routineId}`);
  };

  const toggleCategory = (category: string, isEdit: boolean = false) => {
    const setFn = isEdit ? setEditCategories : setSelectedCategories;
    setFn(current =>
      current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold tracking-tight capitalize">{groupName}</h2>
            {isActive && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                Active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => {
                setEditingGroupName(groupName);
                setEditingGroupDesc(groupDescription || "");
                setIsEditingGroup(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">{groupDescription || "Manage your routines for this group."}</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>New Routine</Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create Routine</CardTitle>
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
              <Label>Focused Parts / Categories</Label>
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

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate}>Save Routine</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routines.map((routine) => (
          <Card
            key={routine.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors relative group"
            onClick={() => handleSelectRoutine(routine.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold capitalize">{routine.name}</CardTitle>
              <AlertDialog>
                <div className="absolute top-4 right-4 flex gap-1 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary z-10"
                    onClick={(e) => openEdit(routine, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialogTrigger render={

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  } />
                </div>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the routine
                      "{routine.name}" and all associated workout history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(routine.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {routine.description || "No description"}
              </p>

              {(routine.focusedParts && routine.focusedParts.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {routine.focusedParts.map(part => (
                    <span key={part} className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded capitalize text-muted-foreground">
                      {part}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 text-xs font-medium text-muted-foreground">
                {routine.exerciseCount} Exercises
              </div>
            </CardContent>
          </Card>
        ))}
        {routines.length === 0 && !isCreating && (
          <div className="col-span-full text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No routines found in this group. Create one to get started!
          </div>
        )}
      </div>

      <Dialog open={!!editingRoutine} onOpenChange={(open) => !open && setEditingRoutine(null)}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Edit Routine</DialogTitle>
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
              <Label>Focused Parts / Categories</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {availableCategories.length === 0 && (
                  <span className="text-sm text-muted-foreground">Loading categories...</span>
                )}
                {availableCategories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded capitalize">
                    <input
                      type="checkbox"
                      checked={editCategories.includes(cat)}
                      onChange={() => toggleCategory(cat, true)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{cat}</span>
                  </label>
                ))}
              </div>
              {editCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {editCategories.map(cat => (
                    <Badge key={cat} variant="secondary" className="capitalize text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoutine(null)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingGroup} onOpenChange={setIsEditingGroup}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Edit Routine Group</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsEditingGroup(false)}>Cancel</Button>
            <Button onClick={handleUpdateGroup}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
