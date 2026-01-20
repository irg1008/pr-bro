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
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

import { toast } from "sonner";

export const RoutineGroupList: React.FC<{ groups: RoutineGroup[] }> = ({ groups }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Routine groups</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={groups.length === 0}
            onClick={() => window.open("/api/backup/routine-groups")}
          >
            Export
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              className="hidden"
              id="import-file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setImportFile(file);
              }}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("import-file")?.click()}
            >
              Import
            </Button>
          </div>

          <AlertDialog open={!!importFile} onOpenChange={(open) => !open && setImportFile(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Import Routine groups</AlertDialogTitle>
                <AlertDialogDescription>
                  This will add any new routine groups from the file. Existing groups with the same
                  ID will be skipped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setImportFile(null);
                    const input = document.getElementById("import-file") as HTMLInputElement;
                    if (input) input.value = "";
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    if (!importFile) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const json = JSON.parse(ev.target?.result as string);

                      toast.promise(
                        fetch("/api/backup/routine-groups", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(json)
                        }),
                        {
                          loading: "Importing routines...",
                          success: () => {
                            navigate(location.pathname);
                            return "Routines imported successfully!";
                          },
                          error: "Import failed"
                        }
                      );
                      setImportFile(null);
                      const input = document.getElementById("import-file") as HTMLInputElement;
                      if (input) input.value = "";
                    };
                    reader.readAsText(importFile);
                  }}
                >
                  Confirm Import
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => setIsCreating(true)}>New group</Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit group name</DialogTitle>
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
            <Button onClick={handleEdit}>Save changes</Button>
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
          <Button onClick={() => setIsCreating(false)} variant="outline">
            Cancel
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card
            key={group.id}
            className={`group relative cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] hover:bg-card/50 ${
              group.isActive ? "border-primary/50 bg-primary/5" : "border-border/40"
            }`}
            onClick={() => handleSelectGroup(group.id)}
          >
            <CardHeader className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold tracking-tight">{group.name}</CardTitle>
                  {group.isActive && (
                    <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wider bg-blue-500 hover:bg-blue-600">
                      Active
                    </Badge>
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
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the group "{group.name}" and all its routines and logs.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(group.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {group.description && (
                <p className="text-muted-foreground text-sm mt-2">{group.description}</p>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {groups.length === 0 && !isCreating && (
        <div className="bg-muted/20 text-muted-foreground rounded-lg border-2 border-dashed px-4 py-12 text-center">
          <p className="mb-2 text-lg font-medium">No routine groups found</p>
          <p className="text-sm">Create a new group to get started!</p>
        </div>
      )}
    </div>
  );
};
