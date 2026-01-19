import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navigate } from "astro:transitions/client";
import type { Exercise, Routine, RoutineExercise } from "prisma/generated/client"; // Ensure these exist or use "prisma/client" if generated is there
import React, { useEffect, useState } from 'react';
import { ActiveWorkout } from './ActiveWorkout';

// Define the composite type for the joined query result
export type RoutineWithExercises = Routine & {
  exercises: (RoutineExercise & {
    exercise: Exercise;
  })[];
};

interface HomePageWrapperProps {
  activeGroupName: string | null;
  nextRoutine: RoutineWithExercises | null;
}

export const HomePageWrapper: React.FC<HomePageWrapperProps> = ({
  activeGroupName,
  nextRoutine
}) => {
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);

  useEffect(() => {
    if (!nextRoutine) return;

    // Check for existing active workout
    const checkActive = async () => {
      try {
        // Fetch recent logs to see if one is active
        const res = await fetch('/api/workout-logs');
        if (res.ok) {
          const logs = await res.json();
          // Find the most recent log for this routine that hasn't officially finished
          // Note: Ideally we'd filter on the server, but for now client-side is okay
          const activeLog = logs.find((l: any) => l.routineId === nextRoutine.id && !l.finishedAt);

          if (activeLog) {
            setActiveLogId(activeLog.id);
            setStartTime(activeLog.createdAt);
          }
        }
      } catch (e) {
        console.error("Failed to check active sessions", e);
      }
    };

    checkActive();
  }, [nextRoutine]);

  const handleStartWorkout = async () => {
    if (!nextRoutine) return;

    const now = new Date().toISOString();
    try {
      const res = await fetch('/api/workout-logs', {
        method: 'POST',
        body: JSON.stringify({
          routineId: nextRoutine.id,
          createdAt: now
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const log = await res.json();
        setActiveLogId(log.id);
        setStartTime(now);
      }
    } catch (e) {
      console.error("Failed to start workout", e);
      alert("Failed to start workout. Please try again.");
    }
  };

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
        <h2 className="text-2xl font-bold mb-4 capitalize">Active: {activeGroupName}</h2>
        <p className="mb-4 text-muted-foreground">No routines found in this group.</p>
        <Button asChild>
          <a href="/routines">Manage Routines</a>
        </Button>
      </div>
    );
  }

  if (activeLogId && startTime) {
    return (
      <ActiveWorkout
        logId={activeLogId}
        initialStartTime={startTime}
        routineName={nextRoutine.name}
        exercises={nextRoutine.exercises.map((e: any) => e.exercise)} // Flatten relation
        onCancel={() => setActiveLogId(null)}
        onCompleteWorkout={() => {
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
          <p className="text-muted-foreground capitalize">Cycle: {activeGroupName}</p>
        </div>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-4xl text-primary capitalize">{nextRoutine.name}</CardTitle>
          <p className="text-lg text-muted-foreground">{nextRoutine.description || "Time to lift heavy things."}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-8">
            <h3 className="font-semibold mb-2">Exercises:</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              {nextRoutine.exercises.map((ex: any) => (
                <li key={ex.id} className="capitalize">{ex.exercise.name} <span className="text-xs text-muted-foreground ml-2">{ex.exercise.category}</span></li>
              ))}
            </ul>
          </div>
          <Button
            size="lg"
            className="w-full text-lg h-16"
            onClick={handleStartWorkout}
            disabled={!nextRoutine.exercises || nextRoutine.exercises.length === 0}
          >
            {(!nextRoutine.exercises || nextRoutine.exercises.length === 0)
              ? "Add exercises to start"
              : "Start Workout"}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center">
        <a href="/routines" className="text-sm text-muted-foreground hover:underline">Change Routine Group</a>
      </div>
    </div>
  );
};
