import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    const groups = await prisma.routineGroup.findMany({
      include: {
        routines: {
          include: {
            exercises: true // Includes RoutineExercise linkage
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
      // Restore/Add data
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
        const newGroup = await tx.routineGroup.create({
          data: {
            ...groupData,
            id: id,
            routines: {
              create: routines?.map((routine: any) => {
                const { id: rId, exercises, routineGroupId, ...routineData } = routine;
                return {
                  ...routineData,
                  id: rId,
                  exercises: {
                    create: exercises?.map((rx: any) => {
                      const { id: rxId, routineId, exerciseId, exercise: _ex, ...rxData } = rx;
                      return {
                        ...rxData,
                        id: rxId,
                        exerciseId: exerciseId
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
