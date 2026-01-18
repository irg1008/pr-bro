import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />
      }}
      toastOptions={{
        classNames: {
          toast: "bg-background text-foreground border-border shadow-lg",
          title: "text-foreground font-semibold",
          description: "text-muted-foreground",
          error: "bg-destructive/10 border-destructive/30 text-destructive",
          success: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
          warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
          info: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
