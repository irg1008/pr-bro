import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ExerciseInfoModal } from "./ExerciseInfoModal";

import type { Exercise } from "prisma/generated/client"; // Import Exercise type

interface ExerciseStat {
  id: string;
  name: string;
  imageUrl?: string | null;
  category: string;
  target?: string;
  history: { date: string; maxWeight: number }[];
  currentMax: number;
  pr: number;
  improvement: number;
  lastTrained: string;
  exercise: Exercise; // Add exercise field
}

interface StatsViewProps {
  stats: ExerciseStat[];
}

export const StatsView: React.FC<StatsViewProps> = ({ stats }) => {
  // Group by category
  const groupedStats = stats.reduce(
    (acc, stat) => {
      const category = stat.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(stat);
      return acc;
    },
    {} as Record<string, typeof stats>
  );

  // Sort categories
  const sortedCategories = Object.keys(groupedStats).sort();

  // Sort items within categories
  sortedCategories.forEach((cat) => {
    groupedStats[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  const [timeRange, setTimeRange] = React.useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("ALL");

  const filterHistory = (history: { date: string; maxWeight: number }[]) => {
    if (timeRange === "ALL") return history;

    const now = new Date();
    const cutoff = new Date();

    if (timeRange === "1M") cutoff.setMonth(now.getMonth() - 1);
    if (timeRange === "3M") cutoff.setMonth(now.getMonth() - 3);
    if (timeRange === "6M") cutoff.setMonth(now.getMonth() - 6);
    if (timeRange === "1Y") cutoff.setFullYear(now.getFullYear() - 1);

    return history.filter((h) => new Date(h.date) >= cutoff);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-2">
        {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((range) => (
          <Badge
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            className="hover:bg-primary/90 cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Badge>
        ))}
      </div>

      {sortedCategories.map((category) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold capitalize text-muted-foreground">{category}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groupedStats[category].map((stat) => {
              const filteredHistory = filterHistory(stat.history);
              if (filteredHistory.length === 0) return null;

              return (
                <Card
                  key={stat.id}
                  className="hover:border-primary/20 overflow-hidden border-2 border-transparent transition-all"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 min-w-0">
                        {stat.imageUrl && (
                          <div className="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded-md border">
                            <img
                              src={stat.imageUrl}
                              alt={stat.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1 md:gap-2 min-w-0">
                          <CardTitle
                            className="line-clamp-1 font-bold capitalize flex items-center gap-2 text-sm sm:text-base leading-tight"
                            title={stat.name}
                          >
                            {stat.name}
                            <ExerciseInfoModal exercise={stat.exercise} />
                          </CardTitle>
                          <div className="flex flex-wrap gap-1">
                            {stat.category && (
                              <span className="text-muted-foreground bg-secondary rounded px-1.5 py-0.5 text-[10px] capitalize">
                                {stat.category.toLowerCase()}
                              </span>
                            )}
                            {stat.target && stat.target !== stat.category && (
                              <span className="text-muted-foreground bg-secondary rounded px-1.5 py-0.5 text-[10px] capitalize">
                                {stat.target.toLowerCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right ml-2">
                        <div className="text-2xl font-bold">{stat.currentMax} kg</div>
                        {stat.improvement !== 0 && (
                          <div
                            className={`text-xs font-bold ${stat.improvement > 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {stat.improvement > 0 ? "+" : ""}
                            {stat.improvement} kg
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-4 -ml-4 h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={filteredHistory}
                          margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id={`gradient-${stat.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--muted))"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric"
                              })
                            }
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                          />
                          <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                            domain={[0, "dataMax + 10"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderRadius: "8px",
                              border: "1px solid hsl(var(--border))"
                            }}
                            itemStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value) => [`${value} kg`, "Max Weight"]}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Area
                            type="basis"
                            dataKey="maxWeight"
                            r={4}
                            fill="var(--chart-1)"
                            fillOpacity={0.5}
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            activeDot={{
                              r: 4,
                              fill: "var(--chart-1)",
                              stroke: "var(--chart-1)",
                              strokeWidth: 2
                            }}
                          >
                            <LabelList
                              dataKey="maxWeight"
                              position="top"
                              offset={10}
                              className="fill-foreground text-[10px] font-bold"
                              formatter={(value) => `${value} kg`}
                            />
                          </Area>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                      <div className="text-muted-foreground text-xs">
                        Last: {new Date(stat.lastTrained).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        PR: {stat.pr} kg
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {stats.length === 0 && (
        <div className="text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed py-12 px-4 text-center">
          <p className="mb-2 text-lg">No stats available yet</p>
          <p className="text-sm">Complete some workouts to see your progress here!</p>
        </div>
      )}
    </div>
  );
};
