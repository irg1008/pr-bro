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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold cursor-pointer" onClick={() => handleNav("/")}>
          <Dumbbell className="h-6 w-6" />
          <span>PR BRO</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => handleNav("/")}
            className={cn("transition-colors hover:text-foreground/80", activePath === "/" ? "text-foreground" : "text-foreground/60")}
          >
            Home
          </button>
          <button
            onClick={() => handleNav("/history")}
            className={cn("transition-colors hover:text-foreground/80", activePath.startsWith("/history") ? "text-foreground" : "text-foreground/60")}
          >
            History
          </button>
          <button
            onClick={() => handleNav("/stats")}
            className={cn("transition-colors hover:text-foreground/80", activePath.startsWith("/stats") ? "text-foreground" : "text-foreground/60")}
          >
            Stats
          </button>
        </nav>
      </div>
    </header>
  );
};
