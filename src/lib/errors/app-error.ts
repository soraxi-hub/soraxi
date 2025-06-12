export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public cause?: string;

  constructor(
    message: string,
    statusCode = 500,
    code?: string,
    cause?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.cause = cause;

    // Ensure correct prototype chain (especially for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
