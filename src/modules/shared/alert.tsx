import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "lucide-react";
import React from "react";

interface AlertUIProps {
  message: string;
  variant?: "default" | "destructive" | null | undefined;
  type?: "error" | "warning" | "info" | "success";
}

function AlertUI({ message, variant, type }: AlertUIProps) {
  const getTypeStyles = (type: string | undefined) => {
    switch (type) {
      case "error":
        return "bg-red-50 text-red-800";
      case "warning":
        return "bg-yellow-50 text-yellow-800";
      case "info":
        return "bg-blue-50 text-blue-800";
      case "success":
        return "bg-soraxi/10 text-soraxi";
      default:
        return "";
    }
  };
  return (
    <Alert
      variant={variant}
      className={cn(getTypeStyles(type), `dark:bg-muted`)}
    >
      <AlertCircleIcon className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default AlertUI;
