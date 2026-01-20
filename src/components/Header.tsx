import { cn } from "@/lib/utils";
import { navigate } from "astro:transitions/client";
import { Dumbbell } from "lucide-react";
import React from "react";

export const Header = () => {
  const [activePath, setActivePath] = React.useState("/");

  React.useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  const handleNav = (path: string) => {
    setActivePath(path);
    navigate(path);
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 relative md:sticky md:top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4">
        <div
          className="flex cursor-pointer items-center gap-2 font-bold"
          onClick={() => handleNav("/")}
        >
          <Dumbbell className="h-6 w-6" />
          <span>PR BRO</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <button
            onClick={() => handleNav("/")}
            className={cn(
              "hover:text-foreground/80 transition-colors",
              activePath === "/" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Home
          </button>
          <button
            onClick={() => handleNav("/history")}
            className={cn(
              "hover:text-foreground/80 transition-colors",
              activePath.startsWith("/history") ? "text-foreground" : "text-foreground/60"
            )}
          >
            History
          </button>
          <button
            onClick={() => handleNav("/stats")}
            className={cn(
              "hover:text-foreground/80 transition-colors",
              activePath.startsWith("/stats") ? "text-foreground" : "text-foreground/60"
            )}
          >
            Stats
          </button>
        </nav>
      </div>
    </header>
  );
};
