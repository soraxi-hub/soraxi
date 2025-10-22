"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResetPasswordInfo,
  resetPasswordSchema,
} from "@/validators/user-signUp-info-validation";

const ResetPassword = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const ref = searchParams.get("ref") || "";
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordInfo>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordInfo) => {
    try {
      const response = await axios.post("/api/auth/reset-password", {
        token,
        newPassword: values.password,
        ref,
      });

      if (response.data.success === true || response.status === 200) {
        toast.success("Password changed successfully");
        router.push("/");
      } else {
        toast.error(
          response?.data?.message ||
            "There was an error resetting your password. Please try again."
        );
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "There was an error resetting your password. Please try again."
      );
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center bg-background">
      <section className="w-full">
        <div className="w-full max-w-sm mx-auto bg-card border border-soraxi-green/15 rounded-lg shadow-md px-6 py-4">
          <h3 className="text-xl font-medium text-center text-gray-600 dark:text-gray-200">
            Reset My Password
          </h3>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-2">
            Provide your new password.
          </p>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-6"
          >
            <div>
              <Label htmlFor="newPassword" className="py-3">
                New Password
              </Label>
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="py-3">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-green-600"
                  onChange={() => setShowPassword(!showPassword)}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-200">
                  Show Password
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader className="animate-spin w-5 h-5 mr-2" />
                  Please wait...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;
