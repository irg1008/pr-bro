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
        "flex items-center gap-1 rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
        className
      )}
    >
      <BatteryCharging className={cn("h-3 w-3", iconClassName)} />
      Deload
    </div>
  );
};
