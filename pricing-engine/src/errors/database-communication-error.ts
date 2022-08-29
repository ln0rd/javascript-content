export class DatabaseCommunicationError extends Error {
  static errorConstructor: ErrorConstructor = Object.create(
    DatabaseCommunicationError.prototype
  ).constructor

  constructor(message?: string) {
    super(message)
    Object.setPrototypeOf(this, DatabaseCommunicationError.prototype)
  }
}
