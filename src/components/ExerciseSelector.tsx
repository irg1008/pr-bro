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
import { navigate } from "astro:transitions/client";
import { Check, Pencil, Plus, Search } from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => Promise<void> | void;
  selectedExerciseIds?: string[];
  routineExercises?: { exerciseId: string; isActive?: boolean | null }[]; // Partial RoutineExercise
  preferredCategories?: string[]; // To sort/filter by routine focus
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelect,
  selectedExerciseIds = [],
  routineExercises = [],
  preferredCategories = [],
  open: controlledOpen,
  onOpenChange,
  trigger
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

  const handleEditClick = async (e: React.MouseEvent, ex: Exercise) => {
    // e.preventDefault/stopPropagation handled in onClick
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    navigate(`/exercises/${ex.id}/edit?returnUrl=${returnUrl}`);
  };

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
  }, [debouncedSearch, activeCategory]);

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
  }, [page, debouncedSearch, activeCategory]);

  const handleExerciseClick = async (ex: Exercise) => {
    // If it's in the routine, allow clicking to reactivate/handle duplicate logic in parent.
    // The previous logic prevented click if selected.
    // We should probably allow it now if we want to "reactivate".
    // But `selectedExerciseIds` is still used to highlight.
    // Let's invoke onSelect regardless, and let parent decide?
    // Or only prevent if it's ACTIVE in the routine?
    // The user requirement says: "this deactivated exercises should show first... I need to be able to when replacing... deactivated should show first".

    // If I click a DEACTIVATED exercise from the "From Routine" list, I want to activate it.
    // My `RoutineDetail` `handleAdd` logic handles this (reactivates if present).
    // So I should allow the click.
    await onSelect(ex);
  };

  // Helper to render a card
  const renderCard = (ex: Exercise, isRoutineItem?: boolean) => {
    const isSelected = selectedExerciseIds.includes(ex.id);
    // If it's a routine item, `isSelected` is likely true.

    return (
      <div
        key={ex.id}
        // Ref only on the main list items
        ref={
          !isRoutineItem && exercises.indexOf(ex) === exercises.length - 1 ? lastElementRef : null
        }
        className={cn(
          "group hover:ring-primary relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-all hover:ring-2",
          isSelected && "ring-primary bg-muted/50 ring-2"
        )}
        onClick={() => handleExerciseClick(ex)}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEditClick(e, ex);
          }}
          className="bg-background/80 hover:bg-background absolute top-2 right-2 z-30 rounded-full p-1.5 opacity-70 shadow-sm backdrop-blur-sm transition-opacity hover:opacity-100"
          title="Edit exercise"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        <div className="bg-muted relative aspect-square overflow-hidden">
          {ex.imageUrl ? (
            <img
              src={ex.imageUrl}
              alt={ex.name}
              loading="lazy"
              className={cn(
                "h-full w-full object-cover transition-transform group-hover:scale-105"
              )}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector(".fallback-text");
                  if (fallback) fallback.classList.remove("hidden");
                }
              }}
            />
          ) : null}
          <div
            className={cn(
              "fallback-text text-muted-foreground/40 pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium",
              ex.imageUrl ? "hidden" : ""
            )}
          >
            No Image
          </div>

          {isSelected && (
            <div className="bg-primary/40 absolute inset-0 z-20 flex items-center justify-center">
              <div className="bg-primary text-primary-foreground rounded-full p-2">
                <Check className="h-6 w-6" />
              </div>
            </div>
          )}
        </div>
        <div className="flex grow flex-col gap-1 p-3">
          <h4 className="pr-4 text-sm leading-tight font-semibold capitalize" title={ex.name}>
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
  };

  // Filter routine items locally - ONLY INACTIVE
  const routineMatches = (routineExercises as any[]).filter((re: any) => {
    if (!re.exercise) return false;
    // Must be inactive in routine to show up here
    if (re.isActive !== false) return false;

    const matchSearch =
      !debouncedSearch || re.exercise.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCategory = !activeCategory || re.exercise.category === activeCategory; // Exact match usually
    return matchSearch && matchCategory;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button className="justify-center">
              <Plus className="h-4 w-4" /> Add exercise
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col p-6">
          <DialogHeader>
            <DialogTitle>Select exercise</DialogTitle>
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
            <div className="min-h-0 flex-1 px-2">
              {/* Routine Exercises Section */}
              {routineMatches.length > 0 && (
                <div className="border-border/60 bg-muted/10 -mx-2 border-b px-2 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-muted-foreground text-sm font-semibold">
                      Inactive from routine
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {routineMatches.map((re) => renderCard(re.exercise, true))}
                  </div>
                </div>
              )}

              {/* Global Search Results */}
              <div className="grid grid-cols-2 gap-4 py-4 md:grid-cols-3">
                {exercises
                  .filter((ex) => !routineMatches.some((rm: any) => rm.exerciseId === ex.id)) // Deduplicate visual
                  .map((ex, index) => {
                    // We reuse the renderCard but pass false for isRoutineItem
                    // Note: renderCard uses checks like ref and click handler.
                    // IMPORTANT: We need passing ref to the last item of THIS list, which is `exercises`.
                    // The renderCard function handles key and onClick.
                    // But we should inline it or adapt logic if ref is tricky.
                    // Let's just inline logic or adapt renderCard.

                    // Adapter for ref:
                    const isLast = index === exercises.length - 1;

                    return (
                      <div key={ex.id} ref={isLast ? lastElementRef : null} className="contents">
                        {renderCard(ex, false)}
                      </div>
                    );
                  })}
                {loading && (
                  <div className="text-muted-foreground col-span-full py-4 text-center">
                    Loading more exercises...
                  </div>
                )}
                {!loading && exercises.length === 0 && routineMatches.length === 0 && (
                  <div className="text-muted-foreground col-span-full py-12 text-center">
                    No exercises found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
