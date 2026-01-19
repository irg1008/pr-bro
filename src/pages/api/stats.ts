import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  // Fetch all exercises and their logs
  const exercises = await prisma.exercise.findMany({
    include: {
      logEntries: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  // Process data for display
  const stats = exercises
    .map((ex) => {
      // Group by date to find max weight per day
      const historyMap = new Map<string, number>();

      ex.logEntries.forEach((log) => {
        const date = new Date(log.createdAt).toISOString().split("T")[0];
        const sets = log.sets as any[];

        if (!Array.isArray(sets)) return;

        const maxWeight = Math.max(...sets.map((s: any) => Number(s.weight) || 0));

        if (maxWeight > 0) {
          const current = historyMap.get(date) || 0;
          if (maxWeight > current) {
            historyMap.set(date, maxWeight);
          }
        }
      });

      let history = Array.from(historyMap.entries())
        .map(([date, maxWeight]) => ({ date, maxWeight }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (history.length === 0) return null;

      // Calculate PR from full history before slicing
      const pr = Math.max(...history.map((h) => h.maxWeight));

      // Limit to last 100 entries for the graph
      if (history.length > 100) {
        history = history.slice(history.length - 100);
      }

      const currentMax = history[history.length - 1].maxWeight;
      const prevMax = history.length > 1 ? history[history.length - 2].maxWeight : 0;

      return {
        id: ex.id,
        name: ex.name,
        imageUrl: ex.imageUrl,
        category: ex.category || "Uncategorized",
        target: ex.target || "Uncategorized",
        history,
        currentMax,
        pr,
        improvement: prevMax ? currentMax - prevMax : 0,
        lastTrained: history[history.length - 1].date
      };
    })
    .filter(Boolean);

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
