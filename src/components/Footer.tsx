import { cn } from "@/lib/utils";
import { navigate } from "astro:transitions/client";
import { ExternalLink, History, Home, LineChart } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";

export const Footer = () => {
  const [activePath, setActivePath] = React.useState("/");

  React.useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  const handleNav = (path: string) => {
    setActivePath(path);
    navigate(path);
  };

  const navItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "History", path: "/history", icon: History },
    { label: "Stats", path: "/stats", icon: LineChart }
  ];

  return (
    <>
      <div className="h-14 md:hidden" /> {/* Spacer for fixed bottom nav */}
      {/* Mobile Bottom Nav */}
      <div className="bg-background fixed right-0 bottom-0 left-0 z-50 border-t p-1 md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-md py-1 px-2 transition-colors",
                activePath === item.path || (item.path !== "/" && activePath.startsWith(item.path))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <item.icon className="mb-0.5 h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Desktop Footer */}
      <footer className="hidden py-6 md:block md:px-8 md:py-0 z-10">
        <div className="container flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Built for PRs.</span>
            <Button variant="link" asChild>
              <a
                href="https://github.com/irg1008/pr-bro"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1"
              >
                Github
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </footer>
    </>
  );
};
