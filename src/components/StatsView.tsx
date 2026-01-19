import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
}

interface StatsViewProps {
  stats: ExerciseStat[];
}

export const StatsView: React.FC<StatsViewProps> = ({ stats }) => {
  // Group by category
  const groupedStats = stats.reduce((acc, stat) => {
    const category = stat.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(stat);
    return acc;
  }, {} as Record<string, typeof stats>);

  // Sort categories
  const sortedCategories = Object.keys(groupedStats).sort();

  // Sort items within categories
  sortedCategories.forEach(cat => {
    groupedStats[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  const [timeRange, setTimeRange] = React.useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');

  const filterHistory = (history: { date: string; maxWeight: number }[]) => {
    if (timeRange === 'ALL') return history;

    const now = new Date();
    const cutoff = new Date();

    if (timeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
    if (timeRange === '3M') cutoff.setMonth(now.getMonth() - 3);
    if (timeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
    if (timeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);

    return history.filter(h => new Date(h.date) >= cutoff);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-2">
        {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(range => (
          <Badge
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/90"
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Badge>
        ))}
      </div>

      {sortedCategories.map(category => (
        <div key={category} className="space-y-4">
          <h2 className="text-2xl font-bold capitalize border-b pb-2">{category}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groupedStats[category].map((stat) => {
              const filteredHistory = filterHistory(stat.history);
              if (filteredHistory.length === 0) return null;

              return (
                <Card key={stat.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {stat.imageUrl && (
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 border">
                            <img src={stat.imageUrl} alt={stat.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <CardTitle className="text-xl capitalize line-clamp-1" title={stat.name}>{stat.name}</CardTitle>
                          <div className="flex gap-2 flex-wrap">
                            {stat.category && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded capitalize">
                                {stat.category.toLowerCase()}
                              </span>
                            )}
                            {stat.target && stat.target !== stat.category && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded capitalize">
                                {stat.target.toLowerCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stat.currentMax} kg</div>
                        {stat.improvement !== 0 && (
                          <div className={`text-xs font-bold ${stat.improvement > 0 ? "text-green-500" : "text-red-500"}`}>
                            {stat.improvement > 0 ? "+" : ""}{stat.improvement} kg
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 w-full mt-4 -ml-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredHistory}>
                          <defs>
                            <linearGradient id={`gradient-${stat.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value) => [`${value} kg`, 'Max Weight']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Area
                            type="monotone"
                            dataKey="maxWeight"
                            stroke="#ef4444"
                            strokeWidth={3}
                            fill={`url(#gradient-${stat.id})`}
                            activeDot={{ r: 6, fill: "hsl(var(--background))", stroke: "#ef4444", strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm">
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
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
          <p className="text-lg mb-2">No stats available yet</p>
          <p className="text-sm">Complete some workouts to see your progress here!</p>
        </div>
      )}
    </div>
  );
};
