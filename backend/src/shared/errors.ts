/** An expected business-rule failure that can be safely shown to a CRM user. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}
