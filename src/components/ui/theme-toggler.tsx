"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Theme Switcher Component
export const ThemeSwitcher = () => {
  const { setTheme } = useTheme();
  const className =
    "rounded-full text-[#ffffffa4] hover:text-soraxi-darkmode-success bg-soraxi-darkmode-background hover:bg-soraxi-darkmode-success/15 transition-colors duration-200";

  return (
    <div className="flex items-center space-x-2 w-fit rounded-full p-1 bg-soraxi-darkmode-background border-[#ffffff28] border">
      <Tooltip>
        <TooltipTrigger>
          <Button
            onClick={() => setTheme("light")}
            className={className}
            size={"icon"}
            aria-label="Switch to light theme"
          >
            <SunIcon className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Light</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button
            onClick={() => setTheme("dark")}
            className={className}
            size={"icon"}
            aria-label="Switch to dark theme"
          >
            <MoonIcon className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Dark</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button
            onClick={() => setTheme("system")}
            className={className}
            size={"icon"}
            aria-label="Switch to system theme"
          >
            <span className="sr-only">System Theme</span>
            <LaptopIcon className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>System</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
