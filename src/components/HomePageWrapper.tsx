import { ThreeBackground } from "@/components/ThreeBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navigate } from "astro:transitions/client";
import type { Exercise, Routine, RoutineExercise } from "prisma/generated/client"; // Ensure these exist or use "prisma/client" if generated is there
import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!nextRoutine) return;

    // Check for existing active workout
    const checkActive = async () => {
      try {
        // Fetch recent logs to see if one is active
        const res = await fetch("/api/workout-logs");
        if (res.ok) {
          const logs = await res.json();
          // Find the most recent log for this routine that hasn't officially finished
          // Note: Ideally we'd filter on the server, but for now client-side is okay
          const activeLog = logs.find((l: any) => l.routineId === nextRoutine.id && !l.finishedAt);

          if (activeLog) {
            setActiveLogId(activeLog.id);
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
      const res = await fetch("/api/workout-logs", {
        method: "POST",
        body: JSON.stringify({
          routineId: nextRoutine.id,
          createdAt: now
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        const log = await res.json();
        navigate(`/workout?id=${log.id}`);
      }
    } catch (e) {
      console.error("Failed to start workout", e);
      alert("Failed to start workout. Please try again.");
    }
  };

  const handleResumeWorkout = () => {
    if (activeLogId) {
      navigate(`/workout?id=${activeLogId}`);
    }
  };

  if (!activeGroupName) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Welcome to PR Bro</h2>
        <p className="text-muted-foreground mb-8">Select a routine group to get started.</p>
        <Button asChild>
          <a href="/routines">Manage Routines</a>
        </Button>
      </div>
    );
  }

  if (!nextRoutine) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold capitalize">Active: {activeGroupName}</h2>
        <p className="text-muted-foreground mb-4">No routines found in this group.</p>
        <Button asChild>
          <a href="/routines">Manage Routines</a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ThreeBackground />
      <div className="relative z-10 mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Today's Workout</h1>
          <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            Cycle:{" "}
            <Badge variant="outline" className="font-normal capitalize">
              {activeGroupName}
            </Badge>
          </p>
        </div>

        <Card className="group/card ring-primary/5 hover:ring-primary/20 relative overflow-hidden border shadow-sm ring-1 transition-all duration-300 hover:shadow-md">
          <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
          <CardHeader className="border-b pb-3">
            <div className="space-y-1">
              <CardTitle className="text-foreground text-lg font-semibold tracking-tight capitalize">
                {nextRoutine.name}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {nextRoutine.description || "Time to lift heavy things."}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-3">
              <h3 className="text-muted-foreground text-xs font-medium uppercase">Workout Plan</h3>
              <div className="grid gap-2">
                {nextRoutine.exercises.map((ex: any) => (
                  <div
                    key={ex.id}
                    className="bg-muted/20 flex items-center justify-between rounded-md border p-2"
                  >
                    <span className="text-foreground text-sm font-medium capitalize">
                      {ex.exercise.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize"
                    >
                      {ex.exercise.category.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <Button
              size="default"
              className="w-full text-sm font-semibold shadow-none"
              onClick={activeLogId ? handleResumeWorkout : handleStartWorkout}
              disabled={!nextRoutine.exercises || nextRoutine.exercises.length === 0}
              variant={activeLogId ? "default" : "default"}
            >
              {!nextRoutine.exercises || nextRoutine.exercises.length === 0
                ? "Add exercises to start"
                : activeLogId
                  ? "Resume Workout"
                  : "Start Workout"}
            </Button>
          </CardContent>
        </Card>

        <Button variant="ghost" asChild>
          <a className="w-full" href="/routines">
            Switch Routine Group
          </a>
        </Button>
      </div>
    </>
  );
};
