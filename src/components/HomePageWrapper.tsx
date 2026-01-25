import { ThreeBackground } from "@/components/ThreeBackground";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { X } from "lucide-react";
import type { Exercise, Routine, RoutineExercise, WorkoutLog } from "prisma/generated/client"; // Ensure these exist or use "prisma/client" if generated is there
import React, { useEffect, useState } from "react";
import { LogDateDisplay } from "./LogDateDisplay";
import { DeloadBadge } from "./ui/DeloadBadge";

// Define the composite type for the joined query result
export type RoutineWithExercises = Routine & {
  isDeload: boolean;
  exercises: (RoutineExercise & {
    exercise: Exercise;
  })[];
};

interface HomePageWrapperProps {
  activeGroupName: string | null;
  nextRoutine: RoutineWithExercises | null;
  activeLog: (WorkoutLog & { entries: any[] }) | null;
}

export const HomePageWrapper: React.FC<HomePageWrapperProps> = ({
  activeGroupName,
  nextRoutine,
  activeLog
}) => {
  const [activeLogId, setActiveLogId] = useState<string | null>(activeLog?.id || null);
  const [activeLogDetails, setActiveLogDetails] = useState<
    (WorkoutLog & { entries: any[] }) | null
  >(activeLog || null);
  const [cancelAlertOpen, setCancelAlertOpen] = useState(false);

  // Effect removed: fetching active log is now done server-side
  useEffect(() => {
    // Only update if prop changes (though usually page reload handles this)
    if (activeLog) {
      setActiveLogId(activeLog.id);
      setActiveLogDetails(activeLog);
    }
  }, [activeLog]);

  const handleStartWorkout = async () => {
    if (!nextRoutine) return;

    const now = new Date().toISOString();
    const { data, error } = await actions.workout.start({
      routineId: nextRoutine.id,
      createdAt: now
    });

    if (!error && data) {
      navigate(`/workout?id=${data.id}`);
    } else {
      console.error("Failed to start workout", error);
      alert("Failed to start workout. Please try again.");
    }
  };

  const handleResumeWorkout = () => {
    if (activeLogId) {
      navigate(`/workout?id=${activeLogId}`);
    }
  };

  const handleCancelWorkout = async () => {
    if (!activeLogId) return;
    const { error } = await actions.workout.cancel({ id: activeLogId });

    if (!error) {
      setActiveLogId(null);
      setActiveLogDetails(null);
      setCancelAlertOpen(false);
    } else {
      console.error("Failed to cancel workout", error);
    }
  };

  if (!activeGroupName) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Welcome to PR Bro</h2>
        <p className="text-muted-foreground mb-8">Select a routine group to get started.</p>
        <Button asChild>
          <a href="/routines">Manage routines</a>
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
          <a href="/routines">Manage routines</a>
        </Button>
      </div>
    );
  }

  // Determine which exercises to show: Active Log Entries OR Static Routine Exercises
  const exercisesToShow = activeLogDetails?.entries?.length
    ? activeLogDetails.entries.map((entry) => ({ exercise: entry.exercise, id: entry.id }))
    : nextRoutine.exercises;

  return (
    <>
      <ThreeBackground />
      <div className="relative z-10 mx-auto max-w-2xl space-y-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Today's workout</h1>
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
            <div className="flex shrink-0 items-center justify-between lg:px-0">
              <div className="flex max-w-[85%] flex-col gap-1">
                <span className="text-foreground text-lg font-semibold tracking-tight capitalize">
                  {nextRoutine.name}
                </span>
                <div className="flex items-center gap-2">
                  {activeLogDetails && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      Started at <LogDateDisplay createdAt={nextRoutine.createdAt} />
                    </span>
                  )}
                  {nextRoutine.isDeload && <DeloadBadge className="py-0.5 text-[10px]" />}
                </div>
                <p className="text-muted-foreground text-sm">
                  {nextRoutine.description || "Time to lift heavy things."}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-3">
              <h3 className="text-muted-foreground text-xs font-medium uppercase">Workout plan</h3>
              <div className="grid gap-2">
                {exercisesToShow.map((ex: any) => (
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
            <div className="flex w-full gap-2">
              <Button
                size="lg"
                variant="accent"
                className="flex-1 text-sm font-semibold shadow-none"
                onClick={activeLogId ? handleResumeWorkout : handleStartWorkout}
                disabled={!nextRoutine.exercises || nextRoutine.exercises.length === 0}
              >
                {!nextRoutine.exercises || nextRoutine.exercises.length === 0
                  ? "Add exercises to start"
                  : activeLogId
                    ? "Resume workout"
                    : "Start workout"}
              </Button>
              {activeLogId && (
                <Button
                  size="lg"
                  variant="outline"
                  className="text-muted-foreground hover:text-destructive hover:border-destructive/50 w-12 px-0"
                  onClick={() => setCancelAlertOpen(true)}
                  title="Cancel workout"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Button variant="ghost" asChild>
          <a className="w-full" href="/routines">
            Switch routine group
          </a>
        </Button>
      </div>

      <AlertDialog open={cancelAlertOpen} onOpenChange={setCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this workout? It will be deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelWorkout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
