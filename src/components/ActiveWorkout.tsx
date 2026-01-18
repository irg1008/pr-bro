import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import type { Exercise } from "prisma/generated/client";
import React, { useState } from 'react';

export interface WorkoutSet {
  weight: number;
  reps: number;
  completed: boolean;
}

interface ActiveWorkoutProps {
  routineName: string;
  exercises: Exercise[];
  onCompleteWorkout: (logs: any) => void;
  onCancel: () => void;
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  routineName,
  exercises,
  onCompleteWorkout,
  onCancel
}) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<Record<string, WorkoutSet[]>>({});

  const currentExercise = exercises[currentExerciseIndex];
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -100) {
      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentExerciseIndex(prev => prev + 1);
      }
    } else if (info.offset.x > 100) {
      if (currentExerciseIndex > 0) {
        setCurrentExerciseIndex(prev => prev - 1);
      }
    }
  };

  const addSet = () => {
    const currentSets = sets[currentExercise.id] || [];
    const newSets = [...currentSets, { weight: 0, reps: 0, completed: false }];
    setSets({ ...sets, [currentExercise.id]: newSets });
  };

  const updateSet = (index: number, field: keyof WorkoutSet, value: number) => {
    const currentSets = sets[currentExercise.id] || [];
    const newSets = [...currentSets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets({ ...sets, [currentExercise.id]: newSets });
  };

  const currentSets = sets[currentExercise.id] || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <h1 className="text-xl font-bold">{routineName}</h1>
        <div className="text-sm text-muted-foreground">
          {currentExerciseIndex + 1} / {exercises.length}
        </div>
      </div>

      {/* Main Swipe Area */}
      <div className="flex-1 relative p-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentExercise.id}
            style={{ x, opacity, scale }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="w-full bg-card rounded-xl shadow-xl overflow-hidden touch-none"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header Image Placeholder */}
            {currentExercise.imageUrl && (
              <div className="h-48 w-full bg-muted relative">
                <img
                  src={currentExercise.imageUrl}
                  alt={currentExercise.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{currentExercise.name}</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground mb-2">
                  <div>Set</div>
                  <div>kg</div>
                  <div>Reps</div>
                </div>

                {currentSets.map((set, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center font-bold bg-muted rounded py-2">{idx + 1}</div>
                    <Input
                      type="number"
                      value={set.weight || ''}
                      onChange={(e) => updateSet(idx, 'weight', Number(e.target.value))}
                      className="text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      value={set.reps || ''}
                      onChange={(e) => updateSet(idx, 'reps', Number(e.target.value))}
                      className="text-center"
                      placeholder="0"
                    />
                  </div>
                ))}

                <Button variant="outline" className="w-full mt-4" onClick={addSet}>
                  + Add Set
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation Hints */}
      <div className="p-4 flex justify-between text-sm text-muted-foreground">
        <span className={currentExerciseIndex === 0 ? "opacity-20" : ""}>← Prev Exercise</span>
        <span className={currentExerciseIndex === exercises.length - 1 ? "opacity-20" : ""}>Next Exercise →</span>
      </div>

      <div className="p-4 bg-background border-t">
        {currentExerciseIndex === exercises.length - 1 ? (
          <Button className="w-full" size="lg" onClick={() => onCompleteWorkout(sets)}>
            Finish Workout
          </Button>
        ) : (
          <Button className="w-full" variant="secondary" onClick={() => setCurrentExerciseIndex(i => i + 1)}>
            Next Exercise
          </Button>
        )}
      </div>
    </div>
  );
};
