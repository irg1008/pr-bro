import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  // Fetch all exercises and their logs
  const exercises = await prisma.exercise.findMany({
    include: {
      logEntries: {
        orderBy: { createdAt: "desc" },
        take: 2 // We only need the last 2 to compare
      }
    }
  });

  // Process data for display
  const stats = exercises
    .map((ex) => {
      const latest = ex.logEntries[0];
      const previous = ex.logEntries[1];

      if (!latest) return null;

      const latestSets = latest.sets as any[];
      const previousSets = previous ? (previous.sets as any[]) : [];

      const maxWeightLatest = Math.max(...latestSets.map((s: any) => Number(s.weight) || 0));
      const maxWeightPrev =
        previousSets.length > 0
          ? Math.max(...previousSets.map((s: any) => Number(s.weight) || 0))
          : 0;

      const diff = maxWeightLatest - maxWeightPrev;

      return {
        id: ex.id,
        name: ex.name,
        category: ex.category,
        lastTrained: latest.createdAt,
        maxWeight: maxWeightLatest,
        improvement: previous ? diff : 0,
        hasHistory: !!previous
      };
    })
    .filter(Boolean);

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
