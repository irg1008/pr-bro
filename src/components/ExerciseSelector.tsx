import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Pencil, Plus, Search } from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { CreateEditExerciseDialog } from "./CreateEditExerciseDialog";

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => Promise<void> | void;
  selectedExerciseIds?: string[];
  preferredCategories?: string[]; // To sort/filter by routine focus
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  allowCustomExerciseCreation?: boolean;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelect,
  selectedExerciseIds = [],
  preferredCategories = [],
  open: controlledOpen,
  onOpenChange,
  trigger,
  allowCustomExerciseCreation = false
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = useCallback(
    (val: boolean) => {
      if (onOpenChange) onOpenChange(val);
      if (controlledOpen === undefined) setInternalOpen(val);
    },
    [onOpenChange, controlledOpen]
  );

  // Create/Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);

  const handleCreateClick = () => {
    setExerciseToEdit(null);
    setDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, ex: Exercise) => {
    e.stopPropagation(); // Prevent selection
    setExerciseToEdit(ex);
    setDialogOpen(true);
  };

  // Add refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    preferredCategories[0] || null
  );

  // Infinite Scroll Observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && exercises.length < total) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, exercises.length, total]
  );

  useEffect(() => {
    // Reset when search or category changes
    setExercises([]);
    setPage(1);
    setTotal(0);
  }, [debouncedSearch, activeCategory, refreshTrigger]);

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: debouncedSearch,
          category: activeCategory || ""
        });

        // Request prioritization if we are just browsing (no specific category filter)
        // This puts the routine's focus areas at the top
        if (!activeCategory && preferredCategories.length > 0) {
          params.append("prioritize", preferredCategories.join(","));
        }

        const res = await fetch(`/api/exercises?${params.toString()}`);
        const data = await res.json();

        setExercises((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setTotal(data.total);
      } catch (error) {
        console.error("Failed to fetch exercises", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [page, debouncedSearch, activeCategory, refreshTrigger]);

  const handleExerciseClick = async (ex: Exercise) => {
    if (selectedExerciseIds.includes(ex.id)) return;
    await onSelect(ex);
    // Optional: don't close dialog right away to allow multiple adds?
    // For now let's keep it open for multi-select feel
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button variant="default" className="w-full justify-between sm:w-62.5">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Exercise
              </span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold text-white dark:text-white">
                {selectedExerciseIds.length} added
              </span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col p-6">
          <DialogHeader>
            <DialogTitle>Select Exercise</DialogTitle>
            <DialogDescription>
              Search and select exercises to add to your routine.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search by name..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {allowCustomExerciseCreation && (
                <Button onClick={handleCreateClick} className="shrink-0 gap-2">
                  <Plus className="h-4 w-4" /> Custom
                </Button>
              )}
            </div>

            {/* Preferred Categories Filter */}
            {preferredCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs font-semibold whitespace-nowrap">
                  Focus:
                </span>
                {preferredCategories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  >
                    {cat}
                  </Badge>
                ))}
                <Badge
                  variant={activeCategory === null ? "secondary" : "ghost"}
                  className="cursor-pointer"
                  onClick={() => setActiveCategory(null)}
                >
                  All
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {/* Controls */}

            {/* Grid */}
            <div className="min-h-0 flex-1 px-2">
              <div className="grid grid-cols-2 gap-4 pt-4 pb-4 md:grid-cols-3">
                {exercises.map((ex, index) => {
                  const isSelected = selectedExerciseIds.includes(ex.id);
                  return (
                    <div
                      key={ex.id}
                      ref={index === exercises.length - 1 ? lastElementRef : null}
                      className={cn(
                        "group hover:ring-primary relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-all hover:ring-2",
                        isSelected && "ring-primary bg-muted/50 ring-2"
                      )}
                      onClick={() => handleExerciseClick(ex)}
                    >
                      <button
                        onClick={(e) => handleEditClick(e, ex)}
                        className="bg-background/80 hover:bg-background absolute top-2 right-2 z-10 rounded-full p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                        title="Edit Exercise"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <div className="bg-muted relative aspect-square overflow-hidden">
                        {ex.imageUrl ? (
                          <img
                            src={ex.imageUrl}
                            alt={ex.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="text-muted-foreground flex h-full items-center justify-center">
                            No Image
                          </div>
                        )}
                        {isSelected && (
                          <div className="bg-primary/40 absolute inset-0 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <Check className="h-6 w-6" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex grow flex-col gap-1 p-3">
                        <h4
                          className="text-sm leading-tight font-semibold capitalize pr-4"
                          title={ex.name}
                        >
                          {ex.name}
                        </h4>
                        <div className="mt-auto flex flex-wrap gap-1 pt-2">
                          <Badge
                            variant="secondary"
                            className="h-fit px-1.5 py-0.5 text-center text-[10px] whitespace-normal capitalize"
                          >
                            {ex.category?.toLowerCase() || "other"}
                          </Badge>
                          {ex.target && ex.target !== ex.category && (
                            <Badge
                              variant="secondary"
                              className="h-fit px-1.5 py-0.5 text-center text-[10px] whitespace-normal capitalize"
                            >
                              {ex.target.toLowerCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="text-muted-foreground col-span-full py-4 text-center">
                    Loading more exercises...
                  </div>
                )}
                {!loading && exercises.length === 0 && (
                  <div className="text-muted-foreground col-span-full py-12 text-center">
                    No exercises found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateEditExerciseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        exerciseToEdit={exerciseToEdit}
        onSave={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </>
  );
};
