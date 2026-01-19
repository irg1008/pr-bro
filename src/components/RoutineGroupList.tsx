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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { navigate } from "astro:transitions/client";
import { Pencil, Trash2 } from "lucide-react";
import type { RoutineGroup } from "prisma/generated/client";
import React, { useState } from "react";

export const RoutineGroupList: React.FC<{ groups: RoutineGroup[] }> = ({ groups }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Edit State
  const [editingGroup, setEditingGroup] = useState<RoutineGroup | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (newGroupName.trim()) {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          body: JSON.stringify({ name: newGroupName }),
          headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
          setNewGroupName("");
          setIsCreating(false);
          navigate(location.pathname);
        }
      } catch (error) {
        console.error("Failed to create group", error);
      }
    }
  };

  const handleEdit = async () => {
    if (!editingGroup || !editName.trim()) return;
    try {
      const res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setEditingGroup(null);
        navigate(location.pathname);
      }
    } catch (error) {
      console.error("Failed to update group", error);
    }
  };

  const openEdit = (group: RoutineGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    setEditName(group.name);
  };

  const handleDelete = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        navigate(location.pathname);
      }
    } catch (error) {
      console.error("Failed to delete group", error);
    }
  };

  const handleSelectGroup = (id: string) => {
    navigate(`/routines/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Routine Groups</h2>
        <Button onClick={() => setIsCreating(true)}>New Group</Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
            <DialogDescription>Enter a new name for this routine group.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCreating && (
        <div className="bg-card text-card-foreground flex gap-2 rounded-lg border p-4 shadow-sm">
          <input
            type="text"
            placeholder="Group Name (e.g., Push-Pull)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button onClick={handleCreate} className="bg-green-600 text-white hover:bg-green-700">
            Save
          </Button>
          <Button onClick={() => setIsCreating(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground group relative cursor-pointer rounded-lg border shadow-sm transition-colors ${group.isActive ? "border-blue-500 bg-blue-500/5" : ""}`}
            onClick={() => handleSelectGroup(group.id)}
          >
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-md leading-none font-semibold tracking-tight md:text-xl">
                    {group.name}
                  </h3>
                  {group.isActive && (
                    <Badge className="bg-blue-500 hover:bg-blue-600">Active</Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary h-8 w-8"
                    onClick={(e) => openEdit(group, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the group "{group.name}" along with ALL its
                          routines and workout history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(group.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {group.description && (
                <p className="text-muted-foreground text-sm">{group.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
