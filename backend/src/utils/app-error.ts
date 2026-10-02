/** An expected business-rule failure that can be safely shown to a CRM user. */
export class AppError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); this.name = 'AppError' }
}
