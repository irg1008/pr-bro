import { cn } from "@/lib/utils";
import { BatteryCharging } from "lucide-react";

interface DeloadBadgeProps {
  className?: string;
  iconClassName?: string;
}

export const DeloadBadge = ({ className, iconClassName }: DeloadBadgeProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800",
        className
      )}
    >
      <BatteryCharging className={cn("h-3 w-3", iconClassName)} />
      Deload
    </div>
  );
};
