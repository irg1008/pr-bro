import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navigate } from "astro:transitions/client";
import React, { useState } from 'react';
import { ActiveWorkout } from './ActiveWorkout';

interface HomePageWrapperProps {
  activeGroupName: string | null;
  nextRoutine: any | null;
}

export const HomePageWrapper: React.FC<HomePageWrapperProps> = ({
  activeGroupName,
  nextRoutine
}) => {
  const [isActive, setIsActive] = useState(false);

  if (!activeGroupName) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Welcome to PR Bro</h2>
        <p className="mb-8 text-muted-foreground">Select a routine group to get started.</p>
        <Button asChild>
          <a href="/routines">Manage Routines</a>
        </Button>
      </div>
    );
  }

  if (!nextRoutine) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Active: {activeGroupName}</h2>
        <p className="mb-4 text-muted-foreground">No routines found in this group.</p>
        <Button asChild>
          <a href="/routines">Manage Routines</a>
        </Button>
      </div>
    );
  }

  if (isActive) {
    return (
      <ActiveWorkout
        routineName={nextRoutine.name}
        exercises={nextRoutine.exercises.map((e: any) => e.exercise)} // Flatten relation
        onCancel={() => setIsActive(false)}
        onCompleteWorkout={async (sets) => {
          // Save result
          const duration = 60 * 45; // Mock duration for now
          await fetch('/api/workout-logs', {
            method: 'POST',
            body: JSON.stringify({
              routineId: nextRoutine.id,
              entries: sets,
              duration
            }),
            headers: { 'Content-Type': 'application/json' }
          });
          navigate(location.pathname);
        }}
      />
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Today's Workout</h1>
          <p className="text-muted-foreground">Cycle: {activeGroupName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href="/history">History</a></Button>
          <Button variant="outline" asChild><a href="/stats">Stats</a></Button>
        </div>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-4xl text-primary">{nextRoutine.name}</CardTitle>
          <p className="text-lg text-muted-foreground">{nextRoutine.description || "Time to lift heavy things."}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-8">
            <h3 className="font-semibold mb-2">Exercises:</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              {nextRoutine.exercises.map((ex: any) => (
                <li key={ex.id}>{ex.exercise.name} <span className="text-xs text-muted-foreground ml-2">{ex.exercise.category}</span></li>
              ))}
            </ul>
          </div>
          <Button size="lg" className="w-full text-lg h-16" onClick={() => setIsActive(true)}>
            Start Workout
          </Button>
        </CardContent>
      </Card>

      <div className="text-center">
        <a href="/routines" className="text-sm text-muted-foreground hover:underline">Change Routine Group</a>
      </div>
    </div>
  );
};
