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
    { label: "Stats", path: "/stats", icon: LineChart },
  ];

  return (
    <>
      <div className="h-16 md:hidden" /> {/* Spacer for fixed bottom nav */}

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-2 md:hidden">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors w-full",
                (activePath === item.path || (item.path !== "/" && activePath.startsWith(item.path)))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Footer */}
      <footer className="hidden md:block py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for PRs.
          </p>
        </div>
      </footer>
    </>
  );
};
