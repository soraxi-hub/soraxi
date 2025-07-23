"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Check, X, Eye, EyeOff, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { userSignUpInfoValidation } from "@/validators/user-signUp-info-validation";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";
import { Progress } from "@/components/ui/progress";
import AlertUI from "@/modules/shared/alert";

const steps = [
  {
    title: "Personal Details",
    fields: ["firstName", "lastName", "otherNames"],
  },
  {
    title: "Address Information",
    fields: ["address", "cityOfResidence", "stateOfResidence", "postalCode"],
  },
  {
    title: "Contact & Security",
    fields: ["email", "phoneNumber", "password", "confirmPassword"],
  },
];

function SignUp() {
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<z.infer<typeof userSignUpInfoValidation>>({
    resolver: zodResolver(userSignUpInfoValidation),
    defaultValues: {
      firstName: "",
      lastName: "",
      otherNames: "",
      email: "",
      password: "",
      confirmPassword: "",
      address: "",
      phoneNumber: "",
      cityOfResidence: "",
      stateOfResidence: "",
      postalCode: "",
    },
  });

  const handleNext = async () => {
    const fields = steps[currentStep - 1].fields as Array<
      | "firstName"
      | "lastName"
      | "otherNames"
      | "email"
      | "password"
      | "confirmPassword"
      | "address"
      | "phoneNumber"
      | "cityOfResidence"
      | "stateOfResidence"
      | "postalCode"
    >;
    const isValid = await form.trigger(fields);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  /**
   * Check password strength and update UI feedback
   */
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    setPasswordChecks(checks);

    // Calculate strength percentage (20% for each check)
    const strength = Object.values(checks).filter(Boolean).length * 20;
    setPasswordStrength(strength);
  };

  /**
   * Get color class based on password strength
   */
  const getStrengthColor = () => {
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  /**
   * Get strength label based on password strength
   */
  const getStrengthLabel = () => {
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 80) return "Moderate";
    return "Strong";
  };

  const getFieldType = (val: string) => {
    switch (val) {
      case "email":
        return "email";
      case "phoneNumber":
        return "tel";
      case "password":
        return showPassword ? "text" : "password";
      case "confirmPassword":
        return showPassword ? "text" : "password";
      default:
        return "text";
    }
  };

  const onSubmit = async (values: z.infer<typeof userSignUpInfoValidation>) => {
    if (values.confirmPassword !== values.password) {
      toast.error("Passwords must match");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`/api/auth/sign-up`, values);
      if (response.status === 200 || response.data.success === true) {
        toast.success("Sign Up Successful");
        router.push("/sign-in");
        return;
      }
      toast.error("An error occurred");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.error?.message || "An error occurred"
        );
        setError(error.response?.data?.error?.message || "An error occurred");
      } else {
        toast.error("An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2 mt-2 border rounded-lg bg-background text-primary focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1";

  return (
    <main className="min-h-screen bg-background transition-colors duration-300">
      <section className="flex flex-col lg:flex-row lg:min-h-screen">
        {/* Progress indicator (Vertical) */}
        <div className="hidden lg:flex flex-col items-center justify-center w-full max-w-[180px] py-12 px-4 bg-soraxi-darkmode-success/15 dark:bg-background border-r-2">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mb-2 text-sm transition-colors duration-300 ${
                  currentStep > index + 1
                    ? "bg-soraxi-darkmode-success text-white"
                    : currentStep === index + 1
                    ? "bg-blue-400 text-white"
                    : "bg-gray-400 text-white"
                }`}
              >
                {index + 1}
              </div>
              <p
                className={`text-xs text-center mb-4 ${
                  currentStep === index + 1
                    ? "text-blue-400 font-semibold"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {step.title}
              </p>
              {index < steps.length - 1 && (
                <div className="w-1 h-8 bg-gray-400 dark:bg-gray-600 mb-4"></div>
              )}
            </div>
          ))}
        </div>

        {/* Form Area */}
        <div className="w-full px-4 lg:px-8 py-10 lg:w-3/4 mx-auto">
          <Link
            href="/"
            className={`flex justify-center mb-6 text-2xl font-bold text-soraxi-darkmode-success ${playpenSans.className}`}
          >
            {siteConfig.name}
          </Link>

          <p className="text-center text-gray-700 dark:text-gray-300 mb-4">
            Let’s get you all set up so you can verify your personal account.
          </p>

          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-6">
              {steps[currentStep - 1].title}
            </h2>

            {error && <AlertUI message={error} variant={"destructive"} />}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Step 1 */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {["firstName", "lastName", "otherNames"].map((field) => (
                      <FormField
                        key={field}
                        control={form.control}
                        name={field as "firstName" | "lastName" | "otherNames"}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder={
                                  field.name === "firstName"
                                    ? "First Name"
                                    : field.name === "lastName"
                                    ? "Last Name"
                                    : "Other Names"
                                }
                                className={inputClass}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "address",
                      "cityOfResidence",
                      "stateOfResidence",
                      "postalCode",
                    ].map((field) => (
                      <FormField
                        key={field}
                        control={form.control}
                        name={
                          field as
                            | "address"
                            | "cityOfResidence"
                            | "stateOfResidence"
                            | "postalCode"
                        }
                        render={({ field }) => (
                          <FormItem
                          // className={
                          //   field.name === "address" ? "md:col-span-2" : ""
                          // }
                          >
                            <FormControl>
                              <Input
                                placeholder={
                                  field.name === "address"
                                    ? "Street Address"
                                    : field.name === "cityOfResidence"
                                    ? "City"
                                    : field.name === "stateOfResidence"
                                    ? "State"
                                    : "Postal Code"
                                }
                                className={inputClass}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {[
                      "email",
                      "phoneNumber",
                      "password",
                      "confirmPassword",
                    ].map((field) => (
                      <FormField
                        key={field}
                        control={form.control}
                        name={
                          field as
                            | "email"
                            | "phoneNumber"
                            | "password"
                            | "confirmPassword"
                        }
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={getFieldType(field.name)}
                                  placeholder={
                                    field.name === "email"
                                      ? "Email Address"
                                      : field.name === "phoneNumber"
                                      ? "Phone Number"
                                      : field.name === "password"
                                      ? "Password"
                                      : "Confirm Password"
                                  }
                                  className={inputClass}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (field.name === "password") {
                                      checkPasswordStrength(e.target.value);
                                    }
                                  }}
                                />
                              </FormControl>
                              {(field.name === "password" ||
                                field.name === "confirmPassword") && (
                                <button
                                  type="button"
                                  className="absolute right-3 top-4 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                  ) : (
                                    <Eye className="h-5 w-5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <FormMessage />

                            {field.name === "password" && (
                              <div className="mt-2 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs">
                                    Password Strength:
                                  </span>
                                  <span className="text-xs font-medium">
                                    {getStrengthLabel()}
                                  </span>
                                </div>
                                <Progress
                                  value={passwordStrength}
                                  className="h-1.5"
                                  indicatorClassName={getStrengthColor()}
                                />

                                {/* Password requirements checklist */}
                                <div className="mt-3 space-y-1.5">
                                  <div className="flex items-center text-xs">
                                    {passwordChecks.length ? (
                                      <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                                    ) : (
                                      <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                                    )}
                                    <span>At least 8 characters</span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    {passwordChecks.uppercase ? (
                                      <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                                    ) : (
                                      <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                                    )}
                                    <span>
                                      At least one uppercase letter (A-Z)
                                    </span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    {passwordChecks.lowercase ? (
                                      <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                                    ) : (
                                      <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                                    )}
                                    <span>
                                      At least one lowercase letter (a-z)
                                    </span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    {passwordChecks.number ? (
                                      <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                                    ) : (
                                      <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                                    )}
                                    <span>At least one number (0-9)</span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    {passwordChecks.special ? (
                                      <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                                    ) : (
                                      <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                                    )}
                                    <span>
                                      At least one special character (!@#$%^&*)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 gap-4">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      onClick={handlePrev}
                      variant="outline"
                      className="w-32"
                    >
                      Previous
                    </Button>
                  )}

                  <div className="flex-1" />

                  {currentStep < steps.length ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="w-32 bg-soraxi-darkmode-success hover:bg-soraxi-darkmode-success/85 text-white"
                    >
                      Next
                    </Button>
                  ) : (
                    <>
                      {isLoading ? (
                        <Button
                          type="submit"
                          className="w-32 bg-soraxi-darkmode-success hover:bg-soraxi-darkmode-success text-white flex items-center justify-center gap-2"
                          disabled={isLoading}
                        >
                          <Loader className=" animate-spin w-5 h-5" /> Signing
                          Up...
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          className="w-32 bg-soraxi-darkmode-success hover:bg-soraxi-darkmode-success text-white"
                        >
                          Sign Up
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </form>
            </Form>

            <div className="text-center mt-6">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-soraxi-darkmode-success font-semibold hover:underline"
                >
                  Sign In
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default SignUp;
