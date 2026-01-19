import { cn } from "@/lib/utils";
import { navigate } from "astro:transitions/client";
import { History, Home, LineChart } from "lucide-react";
import React from "react";

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
      <div className="h-16 md:hidden" /> {/* Spacer for fixed bottom nav */}
      {/* Mobile Bottom Nav */}
      <div className="bg-background fixed right-0 bottom-0 left-0 z-50 border-t p-2 md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-md p-2 transition-colors",
                activePath === item.path || (item.path !== "/" && activePath.startsWith(item.path))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <item.icon className="mb-1 h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Desktop Footer */}
      <footer className="hidden py-6 md:block md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-muted-foreground text-center text-sm leading-loose md:text-left">
            Built for PRs.
          </p>
        </div>
      </footer>
    </>
  );
};
