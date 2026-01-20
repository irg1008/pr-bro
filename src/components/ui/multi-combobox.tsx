import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, Plus, X } from "lucide-react";
import * as React from "react";

interface MultiComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  modal?: boolean;
  onCreate?: (value: string) => void;
}

export function MultiCombobox({
  value = [],
  onChange,
  options,
  placeholder = "Select...",
  modal = false,
  onCreate
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (currentValue: string) => {
    if (value.includes(currentValue)) {
      onChange(value.filter((v) => v !== currentValue));
    } else {
      onChange([...value, currentValue]);
    }
  };

  const handleCreate = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      if (onCreate) {
        onCreate(newValue);
      }
      // Add to selection even if onCreate is separate
      // If onCreate handles generic addition to options, we still need to select it
      // But usually onCreate logic in parent might not auto-select, so we handle it here:
      if (!value.includes(newValue)) {
        onChange([...value, newValue]);
      }
      setInputValue("");
    }
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter((v) => v !== itemToRemove));
  };

  const normalizedOptions = React.useMemo(() => {
    // Filter out already selected items from the dropdown list to avoid clutter?
    // Or keep them and show checkmark. Standard is checkmark.
    // Also include currently selected values if they aren't in options list yet (e.g. newly created)
    const allOpts = new Set([...options, ...value]);
    return Array.from(allOpts).map((opt) => ({
      value: opt,
      label: opt
    }));
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-between h-auto min-h-10 py-2", // Allow growing height
          value.length === 0 && "text-muted-foreground"
        )}
        role="combobox"
        aria-expanded={open}
      >
        <div className="flex flex-wrap gap-1 items-center max-w-[calc(100%-2rem)]">
          {value.length > 0 ? (
            value.map((item) => (
              <Badge key={item} variant="secondary" className="mr-1 mb-1 capitalize">
                {item}
                <div
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </div>
              </Badge>
            ))
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </div>
        {/* Removed ChevronsUpDown */}
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[300px] p-0 z-[60]"
        align="start"
      >
        <Command className="h-auto">
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>
              {onCreate && inputValue ? (
                <div className="p-1">
                  <div
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "w-full cursor-pointer justify-start h-8 px-2"
                    )}
                    onClick={handleCreate}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{inputValue}"
                  </div>
                </div>
              ) : (
                "No results found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  className="capitalize"
                  onSelect={(_) => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
