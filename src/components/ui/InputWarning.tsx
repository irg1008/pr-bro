import React from "react";

interface InputWarningProps {
  message: string;
}

export const InputWarning: React.FC<InputWarningProps> = ({ message }) => (
  <div className="absolute top-full left-0 right-0 z-10 mx-auto mt-1 w-max max-w-[200px] rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-400">
    {message}
  </div>
);
