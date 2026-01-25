import { Button } from "@/components/ui/button";
import { DeloadBadge } from "@/components/ui/DeloadBadge";
import { Timer, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface WorkoutHeaderProps {
  routineName: string;
  initialStartTime: string;
  isDeload: boolean;
  onToggleDeload: () => void;
}

export const WorkoutHeader = ({
  routineName,
  initialStartTime,
  isDeload,
  onToggleDeload
}: WorkoutHeaderProps) => {
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    const start = new Date(initialStartTime).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setDuration(
        h > 0
          ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
          : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [initialStartTime]);

  return (
    <div className="flex items-center justify-between pt-2 pb-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-xl font-bold tracking-tight capitalize sm:text-2xl">
            {routineName}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDeload}
            className={isDeload ? "text-accent" : "text-muted-foreground"}
            title={isDeload ? "Deload active" : "Enable deload"}
          >
            <Zap className={isDeload ? "fill-current" : ""} size={20} />
          </Button>
          {isDeload && <DeloadBadge />}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Timer size={14} />
          <span className="font-medium tabular-nums">{duration}</span>
        </div>
      </div>
    </div>
  );
};
