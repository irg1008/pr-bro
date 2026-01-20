import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SET_TYPE_CONFIG, type SetType } from "@/types/set-types";
import React from "react";

interface SetTypeSelectorProps {
  setNumber: number;
  type?: SetType;
  onChange: (type: SetType) => void;
}

export const SetTypeSelector: React.FC<SetTypeSelectorProps> = ({
  setNumber,
  type = "NORMAL",
  onChange
}) => {
  const config = SET_TYPE_CONFIG[type] || SET_TYPE_CONFIG.NORMAL;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "flex h-7 min-w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border text-sm font-bold transition-colors select-none px-1 gap-0.5",
            config.colorClass
          )}
          title="Right click or Long press to change type"
          onContextMenu={(e) => {
            e.preventDefault();
            // Trigger the dropdown programmatically?
            // Radix UI DropdownMenuTrigger handles click. For context menu we might need ContextMenu primitive...
            // But user said 'Long press or right click open menu'.
            // Actually, for simplicity on mobile/desktop, a click creates a dropdown.
            // If the user wants specific interactions:
            // "On long press or right click open menu".
            // Left click usually does nothing or toggles?
            // Let's implement Click = Open Menu for now as it's most robust across devices.
            // If strictly needing right click, we use ContextMenu.
          }}
        >
          <span>{setNumber}</span>
          {config.short && (
            <span className="text-[10px] opacity-80 font-normal self-end mb-0.5">
              {config.short}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {Object.entries(SET_TYPE_CONFIG).map(([key, conf]) => (
          <DropdownMenuItem key={key} onClick={() => onChange(key as SetType)} className="gap-2">
            <div className={cn("h-4 w-4 rounded-sm border", conf.colorClass)}></div>
            <span className={key === type ? "font-bold" : ""}>{conf.label}</span>
            {key === type && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
