import { cn } from "@/lib/utils";
import { navigate } from "astro:transitions/client";
import { Github } from "lucide-react";
import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

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
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 relative z-50 w-full border-b backdrop-blur md:sticky md:top-0">
      <div className="container flex h-14 items-center justify-between px-4">
        <div
          className="font-elika flex cursor-pointer items-center text-2xl leading-none"
          onClick={() => handleNav("/")}
        >
          PR/BR <span className="-translate-y-0.5">🐼</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <nav className="mr-4 hidden items-center gap-6 text-sm font-medium md:flex">
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
          <Button asChild variant="ghost">
            <a
              href="https://github.com/irg1008/pr-bro"
              target="_blank"
              rel="noreferrer"
              className="text-foreground/60 hover:text-foreground transition-colors md:hidden"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
