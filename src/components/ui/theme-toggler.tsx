"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ThemeSwitcherProps = {
  page?: "admin" | "default" | "user" | "store";
};

export const ThemeSwitcher = ({ page = "default" }: ThemeSwitcherProps) => {
  const { setTheme } = useTheme();

  let containerClass = "";
  let buttonClass = "";
  let iconSize = "h-3 w-3";

  // Apply style variants based on page context
  switch (page) {
    case "store":
    case "user":
    case "admin":
      containerClass = "flex items-center space-x-1 w-fit h-3 ";
      buttonClass =
        "rounded-full bg-muted hover:bg-soraxi-green/20 text-muted-foreground hover:text-primary transition-colors duration-200 h-[25px] w-[25px]";
      iconSize = "h-[10px] w-[10px] p-0.5";
      break;

    default:
      containerClass =
        "flex items-center space-x-2 w-fit rounded-full p-1 bg-soraxi-darkmode-background border-[#ffffff28] border";
      buttonClass =
        "rounded-full text-[#ffffffa4] hover:text-soraxi-green bg-soraxi-darkmode-background hover:bg-soraxi-green/15 transition-colors duration-200";
      break;
  }

  return (
    <div className={containerClass}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setTheme("light")}
            className={buttonClass}
            size="icon"
            aria-label="Switch to light theme"
          >
            <SunIcon className={iconSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Light</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setTheme("dark")}
            className={buttonClass}
            size="icon"
            aria-label="Switch to dark theme"
          >
            <MoonIcon className={iconSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Dark</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setTheme("system")}
            className={buttonClass}
            size="icon"
            aria-label="Switch to system theme"
          >
            <LaptopIcon className={iconSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>System</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

// "use client";

// import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
// import { useTheme } from "next-themes";
// import { Button } from "./button";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";

// // Theme Switcher Component
// export const ThemeSwitcher = () => {
//   const { setTheme } = useTheme();
//   const className =
//     "rounded-full text-[#ffffffa4] hover:text-soraxi-green bg-soraxi-darkmode-background hover:bg-soraxi-green/15 transition-colors duration-200";

//   return (
//     <div className="flex items-center space-x-2 w-fit rounded-full p-1 bg-soraxi-darkmode-background border-[#ffffff28] border">
//       <Tooltip>
//         <TooltipTrigger asChild>
//           <Button
//             onClick={() => setTheme("light")}
//             className={className}
//             size={"icon"}
//             aria-label="Switch to light theme"
//           >
//             <SunIcon className="h-3 w-3" />
//           </Button>
//         </TooltipTrigger>
//         <TooltipContent>
//           <p>Light</p>
//         </TooltipContent>
//       </Tooltip>

//       <Tooltip>
//         <TooltipTrigger asChild>
//           <Button
//             onClick={() => setTheme("dark")}
//             className={className}
//             size={"icon"}
//             aria-label="Switch to dark theme"
//           >
//             <MoonIcon className="h-3 w-3" />
//           </Button>
//         </TooltipTrigger>
//         <TooltipContent>
//           <p>Dark</p>
//         </TooltipContent>
//       </Tooltip>

//       <Tooltip>
//         <TooltipTrigger asChild>
//           <Button
//             onClick={() => setTheme("system")}
//             className={className}
//             size={"icon"}
//             aria-label="Switch to system theme"
//           >
//             <span className="sr-only">System Theme</span>
//             <LaptopIcon className="h-3 w-3" />
//           </Button>
//         </TooltipTrigger>
//         <TooltipContent>
//           <p>System</p>
//         </TooltipContent>
//       </Tooltip>
//     </div>
//   );
// };
