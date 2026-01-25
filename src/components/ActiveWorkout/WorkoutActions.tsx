import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Check, Plus, RotateCcw, X } from "lucide-react";

interface WorkoutActionsProps {
  onFinish: () => void;
  onCancel: () => void;
  onReset: () => void;
  onAddExercise: () => void;
  isComplete: boolean;
}

export const WorkoutActions = ({
  onFinish,
  onCancel,
  onReset,
  onAddExercise,
  isComplete
}: WorkoutActionsProps) => {
  return (
    <div className="bg-background/80 border-border/40 fixed right-0 bottom-0 left-0 z-50 border-t p-4 backdrop-blur-md">
      <div className="container mx-auto flex max-w-xl items-center gap-3">
        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant="outline" size="icon" className="text-destructive h-12 w-12 shrink-0">
              <X size={20} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel workout?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all progress for this session. It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep working</AlertDialogCancel>
              <AlertDialogAction
                onClick={onCancel}
                className="bg-destructive text-destructive-foreground"
              >
                Cancel workout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant="outline" size="icon" className="h-12 w-12 shrink-0">
              <RotateCcw size={20} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset session?</AlertDialogTitle>
              <AlertDialogDescription>
                All entered data will be cleared and reset to routine defaults.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue session</AlertDialogCancel>
              <AlertDialogAction onClick={onReset}>Reset session</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="outline"
          size="icon"
          onClick={onAddExercise}
          className="h-12 w-12 shrink-0"
        >
          <Plus size={20} />
        </Button>

        <Button
          onClick={onFinish}
          className={`h-12 flex-1 shadow-lg transition-all ${
            isComplete ? "bg-accent hover:bg-accent/90 pulse" : "bg-primary hover:bg-primary/90"
          }`}
        >
          <Check size={20} className="mr-2" />
          Finish workout
        </Button>
      </div>
    </div>
  );
};
