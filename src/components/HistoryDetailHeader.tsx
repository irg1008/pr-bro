import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { navigate } from "astro:transitions/client";
import { format } from "date-fns";
import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  Clock,
  MoreVertical,
  Pencil,
  Trash2
} from "lucide-react";
import type { Routine, RoutineGroup, WorkoutLog } from "prisma/generated/client";
import { useState } from "react";
import { toast } from "sonner";

interface HistoryDetailHeaderProps {
  log: WorkoutLog & {
    routine: Routine & { group: RoutineGroup };
  };
  reorderMode: boolean;
  setReorderMode: (mode: boolean) => void;
}

export const HistoryDetailHeader = ({
  log,
  reorderMode,
  setReorderMode
}: HistoryDetailHeaderProps) => {
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Date Editing State
  const [startDate, setStartDate] = useState<Date>(new Date(log.createdAt));
  const [startTime, setStartTime] = useState(format(new Date(log.createdAt), "HH:mm"));

  const [endDate, setEndDate] = useState<Date | undefined>(
    log.finishedAt ? new Date(log.finishedAt) : undefined
  );
  const [endTime, setEndTime] = useState(
    log.finishedAt ? format(new Date(log.finishedAt), "HH:mm") : ""
  );

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/workout-logs/${log.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Log deleted");
        navigate("/history");
      } else {
        toast.error("Failed to delete log");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting log");
    }
  };

  const handleUpdateDate = async () => {
    try {
      const newCreatedAt = new Date(startDate);
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      newCreatedAt.setHours(startHours, startMinutes);

      let newFinishedAt: Date | undefined;
      // If end time is provided, we try to construct finishedAt
      if (endTime) {
        // Use endDate if selected, otherwise fallback to startDate (same day)
        const effectiveEndDate = endDate || startDate;
        newFinishedAt = new Date(effectiveEndDate);
        const [endHours, endMinutes] = endTime.split(":").map(Number);
        newFinishedAt.setHours(endHours, endMinutes);

        // Validation: Start before End
        if (newFinishedAt < newCreatedAt) {
          toast.error("Finish time must be after start time");
          return;
        }

        // Validation: Max 12 hours
        const diffInHours = (newFinishedAt.getTime() - newCreatedAt.getTime()) / (1000 * 60 * 60);
        if (diffInHours > 12) {
          toast.error("Workout cannot be longer than 12 hours");
          return;
        }
      }

      const payload: any = {
        createdAt: newCreatedAt.toISOString()
      };
      if (newFinishedAt) {
        payload.finishedAt = newFinishedAt.toISOString();
      }

      const res = await fetch(`/api/workout-logs/${log.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        toast.success("Date updated");
        setIsEditDateOpen(false);
        navigate(window.location.pathname);
      } else {
        toast.error("Failed to update date");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error updating date");
    }
  };

  return (
    <div className="flex items-start justify-between">
      <div>
        <a href="/history" className="text-muted-foreground mb-2 block text-sm hover:underline">
          ← Back to History
        </a>
        <h1 className="text-3xl font-bold">{log.routine.name}</h1>
        <p className="text-muted-foreground">{log.routine.group.name}</p>
        <p className="text-muted-foreground mt-1">
          {new Date(log.createdAt).toLocaleDateString()} &bull;{" "}
          {new Date(log.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
          {log.finishedAt && (
            <span>
              {" - "}
              {new Date(log.finishedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          )}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setReorderMode(!reorderMode)}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {reorderMode ? "Done reordering" : "Reorder exercises"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditDateOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit date
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Log
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Date Dialog */}
      <Dialog open={isEditDateOpen} onOpenChange={setIsEditDateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit date & time</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Start Picker: Label + Popover(Trigger=Button, Content=[Calendar, TimeInput]) */}
            <div className="flex flex-col gap-2">
              <Label>Start</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      <span>
                        {format(startDate, "dd/MM/yyyy")} {startTime || "..."}
                      </span>
                    ) : (
                      <span>Pick start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                  />
                  <div className="border-border border-t p-3">
                    <Label className="text-muted-foreground mb-2 block text-xs">Time</Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        type="time"
                        className="pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* End Picker: Label + Popover(Trigger=Button, Content=[Calendar, TimeInput]) */}
            <div className="flex flex-col gap-2">
              <Label>Finish</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && !endTime && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate && (
                      <span>
                        {format(endDate, "dd/MM/yyyy")} {endTime || "..."}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || startDate}
                    onSelect={(d) => d && setEndDate(d)}
                  />
                  <div className="border-border border-t p-3">
                    <Label className="text-muted-foreground mb-2 block text-xs">Time</Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        type="time"
                        className="pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDate}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this workout log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
