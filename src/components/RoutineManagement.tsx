import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { navigate } from "astro:transitions/client";
import type { Routine } from "prisma/generated/client";
import React, { useState } from 'react';

type RoutineWithCount = Routine & { exerciseCount: number };

interface RoutineManagementProps {
  groupId: string;
  groupName: string;
  routines?: RoutineWithCount[]; // Optional for now
}

export const RoutineManagement: React.FC<RoutineManagementProps> = ({
  groupId,
  groupName,
  routines = [],
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async () => {
    if (newName.trim()) {
      try {
        const res = await fetch("/api/routines", {
          method: "POST",
          body: JSON.stringify({ name: newName, description: newDesc, routineGroupId: groupId }),
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          setNewName('');
          setNewDesc('');
          setIsCreating(false);
          navigate(location.pathname);
        }
      } catch (error) {
        console.error("Failed to create routine", error);
      }
    }
  };

  const handleSelectRoutine = (routineId: string) => {
    navigate(`/routines/${groupId}/${routineId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{groupName}</h2>
          <p className="text-muted-foreground">Manage your routines for this group.</p>
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
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleSelectRoutine(routine.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold">{routine.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {routine.description || "No description"}
              </p>
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
    </div>
  );
};
