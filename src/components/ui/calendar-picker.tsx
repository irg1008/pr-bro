import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, type ComponentProps } from "react";
import { type DateRange } from "react-day-picker";

type CalendarPickerProps = ComponentProps<typeof Calendar> & {
  variant: ComponentProps<typeof Button>["variant"];
  mode: ComponentProps<typeof Calendar>["mode"];
};

export function CalendarPicker({
  variant,
  captionLayout = "label",
  ...props
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateMulti, setDateMulti] = useState<Date[] | undefined>(undefined);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger
        render={
          <Button id="date" variant={variant} className="w-48 justify-between font-normal">
            {props.mode === "single" && (date ? date.toLocaleDateString() : "Select date")}

            {props.mode === "range" &&
              (dateRange
                ? `${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}`
                : "Select date range")}

            {props.mode === "multiple" &&
              (dateMulti && dateMulti.length > 0
                ? dateMulti.map((d) => d.toLocaleDateString()).join(", ")
                : "Select dates")}
            <ChevronDownIcon />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto overflow-hidden p-0">
        {props.mode === "single" && (
          <Calendar
            {...props}
            mode={props.mode}
            captionLayout={captionLayout}
            selected={props.selected}
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        )}

        {props.mode === "range" && (
          <Calendar
            {...props}
            mode={props.mode}
            captionLayout={captionLayout}
            selected={props.selected}
            onSelect={(range) => {
              setDateRange(range);
              setOpen(false);
            }}
          />
        )}

        {props.mode === "multiple" && (
          <Calendar
            {...props}
            mode={props.mode}
            captionLayout={captionLayout}
            selected={props.selected}
            onSelect={(dates) => {
              setDateMulti(dates);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
