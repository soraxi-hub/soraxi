import { useState } from "react";

export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export interface UsePasswordStrengthReturn {
  passwordStrength: number;
  passwordChecks: PasswordChecks;
  checkPasswordStrength: (password: string) => void;
  getStrengthColor: () => string;
  getStrengthLabel: () => string;
}

/**
 * Reusable hook for evaluating password strength.
 * Use across the application wherever a password
 * field with live feedback is needed.
 */
export const usePasswordStrength = (): UsePasswordStrengthReturn => {
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  /**
   * Evaluates the given password against all criteria and updates state.
   * Call this on every onChange event of the password input.
   */
  const checkPasswordStrength = (password: string) => {
    const checks: PasswordChecks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    setPasswordChecks(checks);

    // 20% per passing check
    const strength = Object.values(checks).filter(Boolean).length * 20;
    setPasswordStrength(strength);
  };

  /** Returns a Tailwind bg color class based on the current strength score. */
  const getStrengthColor = (): string => {
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  /** Returns a human-readable label based on the current strength score. */
  const getStrengthLabel = (): string => {
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 80) return "Moderate";
    return "Strong";
  };

  return {
    passwordStrength,
    passwordChecks,
    checkPasswordStrength,
    getStrengthColor,
    getStrengthLabel,
  };
};
