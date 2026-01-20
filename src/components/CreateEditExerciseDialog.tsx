import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Exercise } from "prisma/generated/client";
import React, { useEffect, useState } from "react";

interface CreateEditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToEdit?: Exercise | null; // If present, we are in Edit mode
  onSave: () => void; // Callback to refresh list
}

export const CreateEditExerciseDialog: React.FC<CreateEditExerciseDialogProps> = ({
  open,
  onOpenChange,
  exerciseToEdit,
  onSave
}) => {
  const isEditMode = !!exerciseToEdit;

  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    category: "",
    bodyPart: "",
    target: "",
    description: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Populate form when opening in Edit mode
  useEffect(() => {
    if (open && exerciseToEdit) {
      setFormData({
        name: exerciseToEdit.name,
        imageUrl: exerciseToEdit.imageUrl || "",
        category: exerciseToEdit.category || "",
        bodyPart: exerciseToEdit.bodyPart || "",
        target: exerciseToEdit.target || "",
        description: exerciseToEdit.description || ""
      });
    } else if (open && !exerciseToEdit) {
      // Reset for create mode
      setFormData({
        name: "",
        imageUrl: "",
        category: "",
        bodyPart: "",
        target: "",
        description: ""
      });
    }
    setError("");
  }, [open, exerciseToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditMode ? `/api/exercises/${exerciseToEdit.id}` : "/api/exercises";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to save exercise");
      }

      onSave();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Exercise" : "Create Custom Exercise"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update exercise details. This change will affect all routines using this exercise."
              : "Add a new custom exercise to your library."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
              <div className="bg-muted mt-2 flex h-32 w-full items-center justify-center overflow-hidden rounded-md border">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="h-full w-full object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Legs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bodyPart">Body Part</Label>
              <Input
                id="bodyPart"
                value={formData.bodyPart}
                onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
                placeholder="e.g. Quadriceps"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target">Target Muscle</Label>
            <Input
              id="target"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              placeholder="e.g. Rectus Femoris"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions or notes..."
            />
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Exercise"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
