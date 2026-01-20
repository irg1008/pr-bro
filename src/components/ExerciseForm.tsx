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
import { navigate } from "astro:transitions/client";
import { Plus, Trash2 } from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import React, { useEffect, useState } from "react";
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
    const fetchValues = async (field: string, setter: (vals: string[]) => void) => {
      try {
        const res = await fetch(`/api/exercises/values?field=${field}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setter(data);
        } else if (field === "equipment") {
          setter(DEFAULT_EQUIPMENT);
        }
      } catch (e) {
        console.error(`Failed to fetch ${field}`, e);
        if (field === "equipment") setter(DEFAULT_EQUIPMENT);
      }
    };

    fetchValues("category", setCategories);
    fetchValues("target", setTargets);
    fetchValues("equipment", setEquipmentList);
  }, []);

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
      const url =
        isEditMode && exerciseToEdit ? `/api/exercises/${exerciseToEdit.id}` : "/api/exercises";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to save exercise");
      }

      const savedExercise = await res.json();
      if (onSave) onSave(savedExercise);

      // If we need to add to routine immediately
      if (addToRoutineId) {
        try {
          await fetch("/api/routine-exercises", {
            method: "POST",
            body: JSON.stringify({
              routineId: addToRoutineId,
              exerciseId: savedExercise.id
            }),
            headers: { "Content-Type": "application/json" }
          });
        } catch (addErr) {
          console.error("Failed to auto-add to routine", addErr);
          // We don't block navigation on this failure, but maybe show toast?
        }
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
    try {
      const res = await fetch(`/api/exercises/${exerciseToEdit.id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error("Failed to delete exercise");
      }
      if (returnUrl) {
        await navigate(returnUrl);
      } else {
        await navigate("/routines");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setDeleteAlert(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4 max-w-2xl mx-auto">
      <div className="grid gap-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                className="h-full w-full object-contain"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Category *</Label>
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
        <Label>Target Muscle *</Label>
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
        <Label>Secondary Muscles</Label>
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
            className="h-6 gap-1 text-muted-foreground hover:text-foreground px-2"
            onClick={() =>
              setFormData({ ...formData, instructions: [...formData.instructions, ""] })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </Button>
        </div>
        <ListInput
          value={formData.instructions}
          onChange={(val: string[]) => setFormData({ ...formData, instructions: val })}
          placeholder="e.g. Stand with feet shoulder-width apart..."
          hideAddButton
        />
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <div className="flex justify-between items-center mt-4">
        {isEditMode && exerciseToEdit ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteAlert(true)}
            disabled={loading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
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
            {loading ? "Saving..." : "Save Exercise"}
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
