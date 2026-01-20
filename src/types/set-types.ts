export type SetType = "NORMAL" | "WARMUP" | "FAILURE" | "DROPSET" | "PAIN";

export interface SetTypeConfig {
  label: string;
  short: string;
  colorClass: string;
  description: string;
}

export const SET_TYPE_CONFIG: Record<SetType, SetTypeConfig> = {
  NORMAL: {
    label: "Normal",
    short: "",
    colorClass: "bg-muted text-muted-foreground border-transparent hover:bg-muted/80",
    description: "Standard working set"
  },
  WARMUP: {
    label: "Warmup",
    short: "W",
    colorClass:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    description: "Warmup set"
  },
  FAILURE: {
    label: "Failure",
    short: "F",
    colorClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    description: "Taken to failure"
  },
  DROPSET: {
    label: "Dropset",
    short: "D",
    colorClass:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    description: "Dropset (reduced weight without rest)"
  },
  PAIN: {
    label: "Pain",
    short: "P",
    colorClass: "bg-rose-950 text-rose-200 border-rose-800 animate-pulse",
    description: "Stopped due to pain"
  }
};
