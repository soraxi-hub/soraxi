import "server-only";
import { randomInt } from "node:crypto";
import { getOTPModel } from "../db/models/otp.model";
import { getUserModel } from "../db/models/user.model";
import { Types } from "mongoose";
import { PasswordService } from "../utils";
import { DateFormatter } from "./date-formatter";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { getStoreModel } from "../db/models/store.model";
import { OtpEntityType, OtpPurpose } from "@/enums";

export class OTP {
  public OTP_CONFIG = {
    LENGTH: 6,
    EXPIRY_MINUTES: 15,
    MAX_ATTEMPTS: 3, // Prevent users from brute-force guessing of OTPs values
    MAX_REQUEST_ATTEMPTS: 3, // Prevent a user from requesting many OTPs within a short period of time
    ATTEMPT_RESET_MINUTES: 720, // 12 hours in minutes, i.e, 60 minutes * 12 hours = 720 minutes
    MIN_REQUEST_INTERVAL_SECONDS: 60, // Prevent spam
  };

  /**
   * Generate a cryptographically secure Token
   */
  generateResetToken(): string {
    return uuidv4({
      random: randomBytes(16),
    });
  }

  /**
   * Generate a cryptographically secure OTP
   */
  generateSecureOTP(length: number = this.OTP_CONFIG.LENGTH): string {
    const digits = "0123456789";
    // Guard: keep OTP lengths reasonable and non-zero
    const len =
      Number.isInteger(length) && length > 0 && length <= 10
        ? length
        : this.OTP_CONFIG.LENGTH;
    let otp = "";
    for (let i = 0; i < len; i++) {
      otp += digits[randomInt(10)];
    }
    return otp;
  }

  /**
   * Check if user has exceeded OTP verification attempts
   */
  hasExceededAttempts(attempts: number, attemptsResetAt: Date | null): boolean {
    if (attempts < this.OTP_CONFIG.MAX_ATTEMPTS) return false;

    // Reset attempts if window has passed
    if (attemptsResetAt && new Date() > attemptsResetAt) return false;

    return true;
  }

  /**
   * Check if user can request OTP (rate limiting)
   */
  canRequestOTP(lastRequestAt: Date | null): boolean {
    if (!lastRequestAt) return true;

    const secondsSinceLastRequest =
      (Date.now() - lastRequestAt.getTime()) / 1000;
    return (
      secondsSinceLastRequest >= this.OTP_CONFIG.MIN_REQUEST_INTERVAL_SECONDS
    );
  }

  /**
   * Check if OTP is expired
   */
  isOTPExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  /**
   * Calculate OTP expiry time
   */
  getOTPExpiry(minutesFromNow: number = this.OTP_CONFIG.EXPIRY_MINUTES): Date {
    return new Date(Date.now() + minutesFromNow * 60 * 1000);
  }

  /**
   * Generate and store OTP in database.
   *
   * Creates a new OTP document
   */
  async createEmailVerificationOTP(
    userId: string,
    purpose: OtpPurpose,
  ): Promise<{
    success: boolean;
    data: {
      otpCode: string;
      expiry: Date;
      userName: string;
      userEmail: string;
      userId: Types.ObjectId;
      otpId: Types.ObjectId;
    } | null;
    message: string;
  }> {
    const OTPModel = await getOTPModel();
    const User = await getUserModel();
    const expiryDate = this.getOTPExpiry();

    const token = this.generateSecureOTP();
    const hashedToken = await PasswordService.hashPassword(token);

    const user = await User.findById(userId);

    if (!user) {
      return {
        success: false,
        data: null,
        message: "User Not Found",
      };
    }

    // Enforce request rate limiting
    if (!this.canRequestOTP(user.lastOtpRequestAt ?? null)) {
      return {
        success: false,
        data: null,
        message: "Please wait before requesting another OTP",
      };
    }

    if (
      user.otpRequestBlockedUntil &&
      new Date() < user.otpRequestBlockedUntil
    ) {
      const timeMessage = DateFormatter.timeRemaining(
        user.otpRequestBlockedUntil,
      );

      return {
        success: false,
        data: null,
        message: `Too many OTP requests. Try again in ${timeMessage}.`,
      };
    }

    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15 mins

    const requestCount = await OTPModel.countDocuments({
      entityId: user._id,
      entityType: OtpEntityType.User,
      purpose,
      createdAt: { $gt: windowStart },
    });

    if (requestCount >= this.OTP_CONFIG.MAX_REQUEST_ATTEMPTS) {
      user.otpRequestBlockedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hrs
      await user.save();

      return {
        success: false,
        data: null,
        message: "Too many OTP requests. Try again later.",
      };
    }

    // Invalidate any existing active OTPs for this user + purpose
    await OTPModel.updateMany(
      {
        entityId: user._id,
        entityType: OtpEntityType.User,
        purpose,
        isUsed: false,
      },
      {
        isUsed: true,
      },
    );

    // Save new OTP (store hashed version ideally)
    const newOTP = await OTPModel.create({
      entityId: user._id,
      entityType: OtpEntityType.User,
      identifier: user.email,
      otpHash: hashedToken,
      purpose,
      attempts: 0,
      maxAttempts: this.OTP_CONFIG.MAX_ATTEMPTS,
      expiresAt: expiryDate,
    });

    // Update minimal user tracking (rate limiting only)
    user.lastOtpRequestAt = new Date();
    await user.save();

    return {
      success: true,
      data: {
        otpCode: token,
        expiry: expiryDate,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userId: user._id,
        otpId: newOTP._id,
      },
      message: "OTP Saved Successfully",
    };
  }

  /**
   * Generate and stores a password reset token for a user in the OTP database.
   *
   * Creates a new OTP document
   */
  async createPasswordResetTokenForUsers(
    email: string,
    purpose: OtpPurpose,
  ): Promise<{
    success: boolean;
    data: {
      resetToken: string;
      expiry: number;
      userEmail: string;
      userId: Types.ObjectId;
      otpId: Types.ObjectId;
    } | null;
    message: string;
  }> {
    const OTPModel = await getOTPModel();
    const User = await getUserModel();
    const expiryDate = this.getOTPExpiry();

    const resetToken = this.generateResetToken();
    const hashedToken = await PasswordService.hashPassword(resetToken);

    const user = await User.findOne({ email });

    /**
     * Prevent email enumeration:
     * Always return success even if user does not exist
     */
    if (!user) {
      return {
        success: true,
        data: null,
        message: "If an account exists, a reset link has been sent.",
      };
    }

    /**
     * Rate limiting: prevent rapid requests
     */
    if (!this.canRequestOTP(user.lastOtpRequestAt ?? null)) {
      return {
        success: false,
        data: null,
        message: "Please wait before requesting another reset link.",
      };
    }

    /**
     * Block window enforcement
     */
    if (
      user.otpRequestBlockedUntil &&
      new Date() < user.otpRequestBlockedUntil
    ) {
      const timeMessage = DateFormatter.timeRemaining(
        user.otpRequestBlockedUntil,
      );

      return {
        success: false,
        data: null,
        message: `Too many requests. Try again in ${timeMessage}.`,
      };
    }

    /**
     * Limit number of requests within a short window (e.g. 15 mins)
     */
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);

    const requestCount = await OTPModel.countDocuments({
      entityId: user._id,
      entityType: OtpEntityType.User,
      purpose,
      createdAt: { $gt: windowStart },
      expiresAt: { $gt: new Date() },
    });

    if (requestCount >= this.OTP_CONFIG.MAX_REQUEST_ATTEMPTS) {
      user.otpRequestBlockedUntil = new Date(
        Date.now() + this.OTP_CONFIG.ATTEMPT_RESET_MINUTES * 60 * 1000,
      );
      await user.save();

      return {
        success: false,
        data: null,
        message: "Too many requests. Try again later.",
      };
    }

    /**
     * Invalidate any existing active tokens
     */
    await OTPModel.updateMany(
      {
        entityId: user._id,
        entityType: OtpEntityType.User,
        purpose,
        isUsed: false,
      },
      {
        isUsed: true,
      },
    );

    /**
     * Create new reset token (hashed)
     */
    const newOTP = await OTPModel.create({
      entityId: user._id,
      entityType: OtpEntityType.User,
      identifier: user.email,
      otpHash: hashedToken,
      purpose,
      attempts: 0,
      maxAttempts: this.OTP_CONFIG.MAX_ATTEMPTS,
      expiresAt: expiryDate,
    });

    /**
     * Update last request timestamp
     */
    user.lastOtpRequestAt = new Date();
    await user.save();

    return {
      success: true,
      data: {
        resetToken, // send raw token to user (email)
        expiry: this.OTP_CONFIG.EXPIRY_MINUTES,
        userEmail: user.email,
        userId: user._id,
        otpId: newOTP._id,
      },
      message: "Reset token created successfully.",
    };
  }

  /**
   * Generate and stores a password reset token for a store in the OTP database.
   *
   * Creates a new OTP document
   */
  async createPasswordResetTokenForStores(
    storeEmail: string,
    purpose: OtpPurpose,
  ): Promise<{
    success: boolean;
    data: {
      resetToken: string;
      expiry: number;
      storeEmail: string;
      storeId: Types.ObjectId;
      otpId: Types.ObjectId;
    } | null;
    message: string;
  }> {
    const OTPModel = await getOTPModel();
    const Store = await getStoreModel();
    const expiryDate = this.getOTPExpiry();

    const resetToken = this.generateResetToken();
    const hashedToken = await PasswordService.hashPassword(resetToken);

    const store = await Store.findOne({ storeEmail });

    /**
     * Prevent email enumeration:
     * Always return success even if store does not exist
     */
    if (!store) {
      return {
        success: true,
        data: null,
        message: "If an account exists, a reset link has been sent.",
      };
    }

    /**
     * Rate limiting: prevent rapid requests
     */
    if (!this.canRequestOTP(store.lastOtpRequestAt ?? null)) {
      return {
        success: false,
        data: null,
        message: "Please wait before requesting another reset link.",
      };
    }

    /**
     * Block window enforcement
     */
    if (
      store.otpRequestBlockedUntil &&
      new Date() < store.otpRequestBlockedUntil
    ) {
      const timeMessage = DateFormatter.timeRemaining(
        store.otpRequestBlockedUntil,
      );

      return {
        success: false,
        data: null,
        message: `Too many requests. Try again in ${timeMessage}.`,
      };
    }

    /**
     * Limit number of requests within a short window (e.g. 15 mins)
     */
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);

    const requestCount = await OTPModel.countDocuments({
      entityId: store._id,
      entityType: OtpEntityType.Store,
      purpose,
      createdAt: { $gt: windowStart },
      expiresAt: { $gt: new Date() },
    });

    if (requestCount >= this.OTP_CONFIG.MAX_REQUEST_ATTEMPTS) {
      store.otpRequestBlockedUntil = new Date(
        Date.now() + this.OTP_CONFIG.ATTEMPT_RESET_MINUTES * 60 * 1000,
      );
      await store.save();

      return {
        success: false,
        data: null,
        message: "Too many requests. Try again later.",
      };
    }

    /**
     * Invalidate any existing active tokens
     */
    await OTPModel.updateMany(
      {
        entityId: store._id,
        entityType: OtpEntityType.Store,
        purpose,
        isUsed: false,
      },
      {
        isUsed: true,
      },
    );

    /**
     * Create new reset token (hashed)
     */
    const newOTP = await OTPModel.create({
      entityId: store._id,
      entityType: OtpEntityType.Store,
      identifier: store.storeEmail,
      otpHash: hashedToken,
      purpose,
      attempts: 0,
      maxAttempts: this.OTP_CONFIG.MAX_ATTEMPTS,
      expiresAt: expiryDate,
    });

    /**
     * Update last request timestamp
     */
    store.lastOtpRequestAt = new Date();
    await store.save();

    return {
      success: true,
      data: {
        resetToken, // send raw token to user (email)
        expiry: this.OTP_CONFIG.EXPIRY_MINUTES,
        storeEmail: store.storeEmail,
        storeId: store._id,
        otpId: newOTP._id,
      },
      message: "Reset token created successfully.",
    };
  }
}
