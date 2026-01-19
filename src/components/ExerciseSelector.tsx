import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Plus, Search } from "lucide-react";
import type { Exercise } from "prisma/generated/client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => Promise<void> | void;
  selectedExerciseIds?: string[];
  preferredCategories?: string[]; // To sort/filter by routine focus
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelect,
  selectedExerciseIds = [],
  preferredCategories = [],
  open: controlledOpen,
  onOpenChange,
  trigger
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = useCallback((val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (controlledOpen === undefined) setInternalOpen(val);
  }, [onOpenChange, controlledOpen]);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [activeCategory, setActiveCategory] = useState<string | null>(preferredCategories[0] || null);

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
          category: activeCategory || "",
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
  }, [page, debouncedSearch, activeCategory]);

  const handleExerciseClick = async (ex: Exercise) => {
    if (selectedExerciseIds.includes(ex.id)) return;
    await onSelect(ex);
    // Optional: don't close dialog right away to allow multiple adds?
    // For now let's keep it open for multi-select feel
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="default" className="w-full sm:w-62.5 justify-between">
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Exercise
            </span>
            <span className="text-[10px] font-bold bg-black/20 text-white dark:text-white px-2 py-0.5 rounded-full">
              {selectedExerciseIds.length} added
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Select Exercise</DialogTitle>
          <DialogDescription>
            Search and select exercises to add to your routine.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Preferred Categories Filter */}
          {preferredCategories.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">Focus:</span>
              {preferredCategories.map(cat => (
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


        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
          {/* Controls */}

          {/* Grid */}
          <div className="flex-1 min-h-0 px-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 pb-4">
              {exercises.map((ex, index) => {
                const isSelected = selectedExerciseIds.includes(ex.id);
                return (
                  <div
                    key={ex.id}
                    ref={index === exercises.length - 1 ? lastElementRef : null}
                    className={cn(
                      "group relative flex flex-col border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary",
                      isSelected && "ring-2 ring-primary bg-muted/50"
                    )}
                    onClick={() => handleExerciseClick(ex)}
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {ex.imageUrl ? (
                        <img
                          src={ex.imageUrl}
                          alt={ex.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-2">
                            <Check className="w-6 h-6" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1 grow">
                      <h4 className="font-semibold text-sm capitalize leading-tight" title={ex.name}>{ex.name}</h4>
                      <div className="flex gap-1 flex-wrap mt-auto pt-2">
                        <Badge variant="secondary" className="text-[10px] h-fit py-0.5 px-1.5 whitespace-normal text-center capitalize">{ex.category?.toLowerCase() || 'other'}</Badge>
                        {ex.target && ex.target !== ex.category && (
                          <Badge variant="secondary" className="text-[10px] h-fit py-0.5 px-1.5 whitespace-normal text-center capitalize">
                            {ex.target.toLowerCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="col-span-full py-4 text-center text-muted-foreground">
                  Loading more exercises...
                </div>
              )}
              {!loading && exercises.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No exercises found.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
