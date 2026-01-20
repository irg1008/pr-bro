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
import { Check, Plus } from "lucide-react";
import * as React from "react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  modal?: boolean; // If used inside a dialog, set true to fix focus issues
  onCreate?: (value: string) => void; // If provided, allows creating new items
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select...",
  modal = false,
  onCreate
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Normalize options for easier comparison
  const normalizedOptions = React.useMemo(() => {
    return options.map((opt) => ({
      value: opt,
      label: opt
    }));
  }, [options]);

  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-between capitalize",
          !value && "text-muted-foreground"
        )}
        role="combobox"
        aria-expanded={open}
      >
        {value ? value : placeholder}
        {/* Removed ChevronsUpDown (sort icon) */}
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0 z-[60]">
        <Command className="h-auto">
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {onCreate && inputValue ? (
                <div className="p-1">
                  <div
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "w-full cursor-pointer justify-start h-8 px-2"
                    )}
                    onClick={() => {
                      const newValue = inputValue.trim();
                      if (newValue) {
                        onCreate(newValue);
                        onChange(newValue);
                        setOpen(false);
                        setInputValue("");
                      }
                    }}
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
                  onSelect={(_) => {
                    // CommandItem value is sometimes lowercased by default implementation
                    // Use the original option.value logic
                    handleSelect(option.value);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
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
