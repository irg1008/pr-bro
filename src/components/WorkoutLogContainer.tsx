import type {
  Exercise,
  Routine,
  RoutineExercise,
  RoutineGroup,
  WorkoutLog,
  WorkoutLogEntry
} from "prisma/generated/client";
import React, { useState } from "react";
import { HistoryDetailHeader } from "./HistoryDetailHeader";
import { WorkoutLogEditor } from "./WorkoutLogEditor";

type WorkoutLogWithDetails = WorkoutLog & {
  routine: Routine & { group: RoutineGroup; exercises: RoutineExercise[] };
  entries: (WorkoutLogEntry & { exercise: Exercise })[];
};

interface WorkoutLogContainerProps {
  log: WorkoutLogWithDetails;
}

export const WorkoutLogContainer: React.FC<WorkoutLogContainerProps> = ({ log }) => {
  const [reorderMode, setReorderMode] = useState(false);

  return (
    <>
      <HistoryDetailHeader log={log} reorderMode={reorderMode} setReorderMode={setReorderMode} />
      <WorkoutLogEditor
        logId={log.id}
        initialEntries={log.entries}
        routine={log.routine}
        reorderMode={reorderMode}
        setReorderMode={setReorderMode}
      />
    </>
  );
};
