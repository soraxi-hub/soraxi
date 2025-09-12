"use client";

export const dynamic = "force-dynamic";

// Core Imports
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

// UI Components
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AccountVerification() {
  // Hooks Initialization
  const router = useRouter();

  // State Management
  const [otp, setOtp] = useState("");
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Countdown Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResendDisabled && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (countdown === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [isResendDisabled, countdown]);

  /**
   * Handles OTP resend request
   * @async
   */
  const handleResendOTP = async () => {
    try {
      await axios.post("/api/auth/verify/send-otp");
      setIsResendDisabled(true);
      setCountdown(60); // Reset 60-second timer
      toast.success(`A new OTP code has been sent to your email!`);
    } catch (error) {
      console.error("Error resending OTP:", error);
      toast.error(`Failed to resend OTP. Please try again later.`);
    }
  };

  /**
   * Handles OTP verification submission
   * @async
   */
  const handleVerification = async () => {
    if (otp.length !== 6) {
      toast.error(`Please enter a valid 6-digit code.`);
      return;
    }

    setIsVerifying(true);
    try {
      const response = await axios.post("/api/auth/verify/verify-otp", {
        token: otp,
      });

      if (response.status === 200) {
        toast.success(`Account verified successfully!`);
        router.push("/profile");
      }
    } catch (error) {
      toast.error(`Verification failed. Please check your code and try again.`);
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-soraxi-green/20 rounded-2xl dark:bg-muted/50">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-soraxi-darkmode-success">
            Verify Your Account
          </CardTitle>
          <CardDescription className="text-primary">
            Enter the 6-digit code sent to your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OTP Input Section */}
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            className="justify-center"
          >
            <InputOTPGroup className="grid grid-cols-6 gap-2 w-full">
              {[...Array(6)].map((_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="aspect-square text-lg border-2 rounded-lg transition-colors"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleVerification}
              disabled={isVerifying || otp.length !== 6}
              size="lg"
              className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
            >
              {isVerifying ? <>Verifying...</> : "Verify Account"}
            </Button>

            <div className="text-center text-sm text-primary">
              Didn&apos;t receive code?{" "}
              <Button
                variant="link"
                onClick={handleResendOTP}
                disabled={isResendDisabled}
                className="text-soraxi-darkmode-success p-0 h-auto"
              >
                {isResendDisabled ? `Resend in ${countdown}s` : "Resend Code"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
