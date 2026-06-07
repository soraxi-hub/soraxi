export class AppError<T = unknown> extends Error {
  public statusCode: number;
  public code?: string;
  public cause?: string;
  public meta?: T;

  constructor(
    message: string,
    statusCode = 500,
    code?: string,
    cause?: string,
    meta?: T,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.cause = cause;
    this.meta = meta;

    // Ensure correct prototype chain (especially for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
