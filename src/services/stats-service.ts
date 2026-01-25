import { db as prisma } from "@/lib/db";
import type { WorkoutSet } from "@/lib/progressive-overload";

export class StatsService {
  /**
   * Get statistics for all exercises, including PRs, history, and improvement.
   */
  static async getGlobalStats(): Promise<any[]> {
    const exercises = await prisma.exercise.findMany({
      include: {
        logEntries: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return exercises
      .map((ex) => {
        const historyMap = new Map<string, number>();

        ex.logEntries.forEach((log) => {
          const date = new Date(log.createdAt).toISOString().split("T")[0];
          const sets = log.sets as unknown as WorkoutSet[];

          if (!Array.isArray(sets)) return;

          const maxWeight = Math.max(...sets.map((s) => Number(s.weight) || 0));

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

        const pr = Math.max(...history.map((h) => h.maxWeight));

        // Limit history for visualization
        const graphHistory = history.length > 100 ? history.slice(history.length - 100) : history;

        const currentMax = history[history.length - 1].maxWeight;
        const prevMax = history.length > 1 ? history[history.length - 2].maxWeight : 0;

        return {
          id: ex.id,
          name: ex.name,
          imageUrl: ex.imageUrl,
          category: ex.category || "Uncategorized",
          target: ex.target || "Uncategorized",
          history: graphHistory,
          fullHistory: history,
          currentMax,
          pr,
          improvement: prevMax ? currentMax - prevMax : 0,
          lastTrained: history[history.length - 1].date,
          exercise: ex
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  /**
   * Get detailed history for a specific exercise.
   */
  static async getExerciseHistory(exerciseId: string, excludeLogId?: string) {
    const logEntries = await prisma.workoutLogEntry.findMany({
      where: {
        exerciseId,
        workoutLogId: excludeLogId ? { not: excludeLogId } : undefined,
        workoutLog: { finishedAt: { not: null } }
      },
      orderBy: { createdAt: "desc" },
      include: { workoutLog: true }
    });

    return logEntries;
  }
}
