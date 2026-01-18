import { navigate } from "astro:transitions/client";
import type { RoutineGroup } from "prisma/generated/client";
import React, { useState } from 'react';


// Props interface removed as we use inline type now or can simplify

export const RoutineGroupList: React.FC<{ groups: RoutineGroup[] }> = ({ groups }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreate = async () => {
    if (newGroupName.trim()) {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          body: JSON.stringify({ name: newGroupName }),
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          setNewGroupName('');
          setIsCreating(false);
          navigate(location.pathname);
        }
      } catch (error) {
        console.error("Failed to create group", error);
      }
    }
  };

  const handleSelectGroup = (id: string) => {
    navigate(`/routines/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Routine Groups</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          New Group
        </button>
      </div>

      {isCreating && (
        <div className="flex gap-2 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
          <input
            type="text"
            placeholder="Group Name (e.g., Push-Pull)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded-md">Save</button>
          <button onClick={() => setIsCreating(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cancel</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => handleSelectGroup(group.id)}
          >
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{group.name}</h3>
              {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
