"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { usePasswordStrength } from "@/hooks/use-password-strength.hook";
import { PasswordStrengthIndicator } from "../shared/password-strength-indicator";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
} from "@/validators/change-password-validator";
import AlertUI from "@/modules/shared/alert";
import { useAuth } from "@/hooks/use-auth-hook";

export function UserSecurityPage() {
  const { handleLogout } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = usePasswordStrength();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.patch(`/api/auth/change-password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        ref: "user",
      });

      if (
        (response.status >= 200 && response.status < 300) ||
        response.data?.success === true
      ) {
        toast.success("Password changed successfully");
        form.reset();
        strength.checkPasswordStrength("");
        handleLogout();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.error?.message || "An error occurred";
        toast.error(message);
        setError(message);
      } else {
        toast.error("An error occurred");
        setError("An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2 mt-2 border rounded-lg bg-background text-primary focus:!ring-soraxi-green focus:!outline-none focus:!ring-1";

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl font-semibold">Account Security</h1>
          <p className="text-sm text-muted-foreground">
            Update your login credentials
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <AlertUI variant="destructive" message={error} />
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Current Password */}
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-4 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New Password */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      className={inputClass}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        strength.checkPasswordStrength(e.target.value);
                      }}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-4 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <FormMessage />
                <PasswordStrengthIndicator strength={strength} />
              </FormItem>
            )}
          />

          {/* Confirm New Password */}
          <FormField
            control={form.control}
            name="confirmNewPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-4 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin w-4 h-4" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
