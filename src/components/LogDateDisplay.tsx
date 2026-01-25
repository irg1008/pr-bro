"use client";

import React, { useEffect, useState } from "react";

interface LogDateDisplayProps {
  createdAt: Date | string;
  finishedAt?: Date | string | null;
  className?: string;
}

export const LogDateDisplay: React.FC<LogDateDisplayProps> = ({
  createdAt,
  finishedAt,
  className
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // or a skeleton/loading state
  }

  const startDate = new Date(createdAt);
  const startTime = startDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  const endDate = finishedAt ? new Date(finishedAt) : null;
  const endTime = endDate
    ? endDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  return (
    <span className={className}>
      {startDate.toLocaleDateString()} &bull; {startTime}
      {endTime && ` - ${endTime}`}
    </span>
  );
};
