import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    const groups = await prisma.routineGroup.findMany({
      include: {
        routines: {
          include: {
            exercises: {
              include: {
                exercise: true // Include full exercise data for import
              }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return new Response(JSON.stringify(groups), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="routine-groups.json"'
      }
    });
  } catch (error) {
    console.error("Export failed:", error);
    return new Response(JSON.stringify({ error: "Export failed" }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const groups = await request.json();

    if (!Array.isArray(groups)) {
      return new Response("Invalid data format. Expected array of groups.", { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Step 1: Collect all unique exercises from import data
      const exercisesMap = new Map<string, any>(); // exerciseId -> exercise data

      for (const group of groups) {
        for (const routine of group.routines || []) {
          for (const rx of routine.exercises || []) {
            if (rx.exercise && rx.exerciseId) {
              exercisesMap.set(rx.exerciseId, rx.exercise);
            }
          }
        }
      }

      // Step 2: Get all existing exercises by ID
      const existingById = await tx.exercise.findMany({
        where: { id: { in: Array.from(exercisesMap.keys()) } }
      });
      const existingIdSet = new Set(existingById.map((e) => e.id));

      // Step 3: For exercises not found by ID, check by name
      const exercisesToProcess = Array.from(exercisesMap.entries());
      const idMapping = new Map<string, string>(); // oldId -> actualId

      for (const [exerciseId, exerciseData] of exercisesToProcess) {
        if (existingIdSet.has(exerciseId)) {
          // Exercise exists by ID - update it
          const { id: _id, createdAt: _c, updatedAt: _u, ...updateData } = exerciseData;
          await tx.exercise.update({
            where: { id: exerciseId },
            data: updateData
          });
          idMapping.set(exerciseId, exerciseId);
        } else {
          // Check if exists by name
          const existingByName = await tx.exercise.findFirst({
            where: { name: { equals: exerciseData.name, mode: "insensitive" } }
          });

          if (existingByName) {
            // Found by name - update it and map old ID to existing ID
            const { id: _id, createdAt: _c, updatedAt: _u, ...updateData } = exerciseData;
            await tx.exercise.update({
              where: { id: existingByName.id },
              data: updateData
            });
            idMapping.set(exerciseId, existingByName.id);
          } else {
            // Does not exist - create it with a new ID
            const { id: _id, createdAt: _c, updatedAt: _u, ...createData } = exerciseData;
            const created = await tx.exercise.create({
              data: {
                ...createData,
                name: exerciseData.name,
                category: createData.category || "Other",
                bodyPart: createData.bodyPart || createData.category?.toLowerCase() || "other"
              }
            });
            idMapping.set(exerciseId, created.id);
          }
        }
      }

      // Step 4: Create groups with mapped exercise IDs
      for (const group of groups) {
        const { id, routines, ...groupData } = group;

        // Check if group exists
        const existingGroup = await tx.routineGroup.findUnique({
          where: { id: id }
        });

        if (existingGroup) {
          // Conflict -> Skip
          continue;
        }

        // Create Group recursively
        await tx.routineGroup.create({
          data: {
            ...groupData,
            id: id,
            routines: {
              create: routines?.map((routine: any) => {
                const { id: rId, exercises, routineGroupId: _rgId, ...routineData } = routine;
                return {
                  ...routineData,
                  id: rId,
                  exercises: {
                    create: exercises?.map((rx: any) => {
                      const {
                        id: rxId,
                        routineId: _rId,
                        exerciseId,
                        exercise: _ex,
                        ...rxData
                      } = rx;

                      // Use mapped exercise ID
                      const mappedExerciseId = idMapping.get(exerciseId) || exerciseId;

                      return {
                        ...rxData,
                        id: rxId,
                        exerciseId: mappedExerciseId
                      };
                    })
                  }
                };
              })
            }
          }
        });
      }
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Import failed:", error);
    return new Response(JSON.stringify({ error: "Import failed: " + (error as Error).message }), {
      status: 500
    });
  }
};
