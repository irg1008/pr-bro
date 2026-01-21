import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response("Log ID is required", { status: 400 });
  }

  try {
    // 1. Fetch Log and Routine
    const log = await prisma.workoutLog.findUnique({
      where: { id },
      include: {
        routine: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });

    if (!log) {
      return new Response("Log not found", { status: 404 });
    }

    if (!log.routine) {
      return new Response("Routine not found for this log", { status: 404 });
    }

    // 2. Delete existing entries
    await prisma.workoutLogEntry.deleteMany({
      where: { workoutLogId: id }
    });

    // 3. Create new entries from Routine Exercises
    // We use a transaction to ensure atomicity if needed, but simple await sequence is okay here as we are just "resetting"

    // Prepare data directly for createMany if possible, or use create in a loop if we need complex relations (we don't for entries usually)
    // Note: workoutLogEntry has sets as Json.
    // We need to initialize sets as empty array or whatever standard is.
    // ActiveWorkout typically handles empty sets.
    // But we should create at least one empty set if that's the expected initial state?
    // In ActiveWorkout.tsx:
    // initialExercises.forEach((ex) => { initialSets[ex.id] = [createEmptySet(ex.type)]; });
    // So the frontend generates the initial sets.
    // The entries in DB store the sets.
    // So we should probably initialize them with one empty set?

    // Function to create empty set
    const createEmptySet = (type: string) => {
      if (type === "CARDIO")
        return { type: "CARDIO", duration: "", distance: "", completed: false };
      return { weight: "", reps: "", completed: false };
    };

    const newEntriesData = log.routine.exercises.map((re) => ({
      workoutLogId: id,
      exerciseId: re.exerciseId,
      order: re.order,
      isSuperset: re.isSuperset,
      note: null, // Session note reset
      sets: [createEmptySet(re.exercise.type)] // Initialize with 1 empty set
    }));

    // Use transaction for delete + create to be safe
    await prisma.$transaction(async (tx) => {
      await tx.workoutLogEntry.deleteMany({ where: { workoutLogId: id } });

      // createMany is not supported in sqlite but we use postgres.
      // Prisma createMany is supported.
      if (newEntriesData.length > 0) {
        await tx.workoutLogEntry.createMany({
          data: newEntriesData
        });
      }

      // Update log timestamp? User said "keeping the createdAt".
      // We might want to update updatedAt.
      await tx.workoutLog.update({
        where: { id },
        data: { updatedAt: new Date() }
      });
    });

    // 4. Return the new list of exercises formatted for ActiveWorkout
    // We need to re-map them similar to workout.astro
    const refreshedExercises = log.routine.exercises.map((re) => ({
      ...re.exercise,
      routineNote: re.note,
      sessionNote: null,
      targetSets: re.targetSets,
      targetReps: re.targetReps,
      targetRepsToFailure: re.targetRepsToFailure
      // We also need to tell frontend about isSuperset status?
      // ActiveWorkout takes initialSupersetStatus as a separate prop.
      // We can return that too.
    }));

    const newSupersetStatus: Record<string, boolean> = {};
    log.routine.exercises.forEach((re) => {
      if (re.isSuperset) newSupersetStatus[re.exerciseId] = true;
    });

    // We also need the sets!
    // Since we just initialized them, we can construct the sets object to return
    const newSets: Record<string, any[]> = {};
    log.routine.exercises.forEach((re) => {
      newSets[re.exerciseId] = [createEmptySet(re.exercise.type)];
    });

    return new Response(
      JSON.stringify({
        exercises: refreshedExercises,
        supersetStatus: newSupersetStatus,
        sets: newSets
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Reset failed:", error);
    return new Response(JSON.stringify({ error: "Reset failed" }), { status: 500 });
  }
};
