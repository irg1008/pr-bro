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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListInput } from "@/components/ui/list-input";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { Copy, Plus, Trash2 } from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import React, { useEffect, useState } from "react";
import { ExerciseSelector } from "./ExerciseSelector";
import { Combobox } from "./ui/combobox";
import { MultiCombobox } from "./ui/multi-combobox";

interface ExerciseFormProps {
  exerciseToEdit?: Exercise | null;
  onSave?: (exercise: Exercise) => void;
  onCancel?: () => void;
  returnUrl?: string;
  addToRoutineId?: string | null;
}

export const ExerciseForm: React.FC<ExerciseFormProps> = ({
  exerciseToEdit,
  onSave,
  onCancel,
  returnUrl,
  addToRoutineId
}) => {
  const isEditMode = !!exerciseToEdit;

  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    category: "",
    target: "",
    equipment: "",
    secondaryMuscles: [] as string[],
    instructions: [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Reset image error when URL changes
  useEffect(() => {
    setImageError(false);
  }, [formData.imageUrl]);

  useEffect(() => {
    if (exerciseToEdit) {
      setFormData({
        name: exerciseToEdit.name,
        imageUrl: exerciseToEdit.imageUrl || "",
        category: exerciseToEdit.category || "",
        target: exerciseToEdit.target || "",
        equipment: exerciseToEdit.equipment || "",
        secondaryMuscles: exerciseToEdit.secondaryMuscles || [],
        instructions: exerciseToEdit.instructions || []
      });
    }
  }, [exerciseToEdit]);

  const [categories, setCategories] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);

  // Common equipment defaults if API returns empty
  const DEFAULT_EQUIPMENT = [
    "Barbell",
    "Dumbbell",
    "Machine",
    "Cable",
    "Bodyweight",
    "Kettlebell",
    "Smith Machine",
    "Band",
    "EZ Bar",
    "Cardio"
  ];

  useEffect(() => {
    (async () => {
      const { data: cats } = await actions.exercise.getUniqueValues({ field: "category" });
      if (cats) setCategories(cats);

      const { data: targs } = await actions.exercise.getUniqueValues({ field: "target" });
      if (targs) setTargets(targs);

      const { data: equip } = await actions.exercise.getUniqueValues({ field: "equipment" });
      if (equip) {
        setEquipmentList(equip.length > 0 ? equip : DEFAULT_EQUIPMENT);
      } else {
        setEquipmentList(DEFAULT_EQUIPMENT);
      }
    })();
  }, []);

  const handleSelectExisting = (ex: Exercise) => {
    setFormData({
      name: `${ex.name} (Copy)`,
      imageUrl: ex.imageUrl || "",
      category: ex.category || "",
      target: ex.target || "",
      equipment: ex.equipment || "",
      secondaryMuscles: ex.secondaryMuscles || [],
      instructions: ex.instructions || []
    });
    setSelectorOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.category) {
      setError("Category is required");
      setLoading(false);
      return;
    }
    if (!formData.target) {
      setError("Target muscle is required");
      setLoading(false);
      return;
    }

    try {
      let savedExercise: Exercise | undefined;

      if (isEditMode && exerciseToEdit) {
        const { data, error: editError } = await actions.exercise.updateExercise({
          id: exerciseToEdit.id,
          ...formData
        });
        if (editError) throw new Error(editError.message);
        savedExercise = data;
      } else {
        const { data, error: createError } = await actions.exercise.createExercise(formData);
        if (createError) throw new Error(createError.message);
        savedExercise = data;
      }

      if (savedExercise && onSave) onSave(savedExercise);

      // If we need to add to routine immediately
      if (savedExercise && addToRoutineId) {
        await actions.routine.addExercise({
          routineId: addToRoutineId,
          exerciseId: savedExercise.id
        });
      }

      if (returnUrl) {
        await navigate(returnUrl);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (onCancel) onCancel();
    if (returnUrl) {
      await navigate(returnUrl);
    }
  };

  const handleDelete = async () => {
    if (!exerciseToEdit) return;
    setLoading(true);
    const { error: deleteError } = await actions.exercise.deleteExercise({
      id: exerciseToEdit.id
    });
    if (!deleteError) {
      if (returnUrl) {
        await navigate(returnUrl);
      } else {
        await navigate("/routines");
      }
    } else {
      setError(deleteError.message);
      setLoading(false);
      setDeleteAlert(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto grid max-w-2xl gap-6 py-4">
      {!isEditMode && (
        <div className="flex justify-end">
          <ExerciseSelector
            open={selectorOpen}
            onOpenChange={setSelectorOpen}
            onSelect={(ex) => handleSelectExisting(ex)}
            trigger={
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Copy className="h-4 w-4" />
                Start from existing
              </Button>
            }
          />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            setError("");
          }}
          error={error}
          placeholder="e.g. Barbell Squat"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="imageUrl">Image URL (Optional)</Label>
        <Input
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
        {formData.imageUrl && (
          <div className="bg-muted mt-2 flex h-40 w-full items-center justify-center overflow-hidden rounded-md border">
            {!imageError ? (
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="h-full w-full bg-white object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
                <span>Failed to load image</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>
            Category <span className="text-destructive">*</span>
          </Label>
          <Combobox
            value={formData.category}
            onChange={(val: string) => setFormData({ ...formData, category: val })}
            options={categories}
            placeholder="Select category..."
            // modal={false} // No longer inside dialog
            onCreate={(val: string) => {
              setFormData({ ...formData, category: val });
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label>Equipment</Label>
          <Combobox
            value={formData.equipment}
            onChange={(val: string) => setFormData({ ...formData, equipment: val })}
            options={equipmentList}
            placeholder="Select equipment..."
            // modal={false}
            onCreate={(val: string) => {
              setFormData({ ...formData, equipment: val });
            }}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>
          Target muscle <span className="text-destructive">*</span>
        </Label>
        <Combobox
          value={formData.target}
          onChange={(val: string) => setFormData({ ...formData, target: val })}
          options={targets}
          placeholder="Select target muscle..."
          // modal={false}
          onCreate={(val: string) => {
            setFormData({ ...formData, target: val });
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label>Secondary muscles</Label>
        <MultiCombobox
          value={formData.secondaryMuscles}
          onChange={(val: string[]) => setFormData({ ...formData, secondaryMuscles: val })}
          options={targets}
          placeholder="Select secondary muscles..."
          // modal={false}
          onCreate={(_) => {}}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Instructions (step-by-step)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-6 gap-1 px-2"
            onClick={() =>
              setFormData({ ...formData, instructions: [...formData.instructions, ""] })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add step
          </Button>
        </div>
        <ListInput
          value={formData.instructions}
          onChange={(val: string[]) => setFormData({ ...formData, instructions: val })}
          placeholder="e.g. Stand with feet shoulder-width apart..."
          hideAddButton
        />
      </div>

      {error && error !== "An exercise with this name already exists" && (
        <p className="text-destructive text-sm font-medium">{error}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        {isEditMode && exerciseToEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-8 w-8"
            onClick={() => setDeleteAlert(true)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <div></div> // Spacer
        )}
        <div className="flex gap-2">
          {(onCancel || returnUrl) && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !formData.name?.trim() || !formData.category || !formData.target}
          >
            {loading ? "Saving..." : "Save exercise"}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteAlert} onOpenChange={setDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exercise "
              {exerciseToEdit?.name}" and remove it from our servers.
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
    </form>
  );
};
