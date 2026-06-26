"use client";

import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { UsePasswordStrengthReturn } from "@/hooks/use-password-strength.hook";

interface PasswordStrengthIndicatorProps {
  /**
   * Pass the return value of usePasswordStrength() from the parent.
   * This keeps the hook's state in the parent so it can also call
   * checkPasswordStrength on the input's onChange.
   */
  strength: UsePasswordStrengthReturn;
}

const checks: {
  key: keyof UsePasswordStrengthReturn["passwordChecks"];
  label: string;
}[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "At least one uppercase letter (A-Z)" },
  { key: "lowercase", label: "At least one lowercase letter (a-z)" },
  { key: "number", label: "At least one number (0-9)" },
  { key: "special", label: "At least one special character (!@#$%^&*)" },
];

/**
 * Renders a password strength progress bar and a requirement checklist.
 * Consume usePasswordStrength() in the parent, pass the result as `strength`,
 * and call strength.checkPasswordStrength(value) inside the password input's onChange.
 *
 * @example
 * const strength = usePasswordStrength();
 *
 * <Input onChange={(e) => { field.onChange(e); strength.checkPasswordStrength(e.target.value); }} />
 * <PasswordStrengthIndicator strength={strength} />
 */
export function PasswordStrengthIndicator({
  strength,
}: PasswordStrengthIndicatorProps) {
  const {
    passwordStrength,
    passwordChecks,
    getStrengthColor,
    getStrengthLabel,
  } = strength;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs">Password Strength:</span>
        <span className="text-xs font-medium">{getStrengthLabel()}</span>
      </div>

      <Progress
        value={passwordStrength}
        className="h-1.5"
        indicatorClassName={getStrengthColor()}
      />

      <div className="mt-3 space-y-1.5">
        {checks.map(({ key, label }) => (
          <div key={key} className="flex items-center text-xs">
            {passwordChecks[key] ? (
              <Check className="h-3.5 w-3.5 text-green-500 mr-1.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-red-500 mr-1.5 shrink-0" />
            )}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
