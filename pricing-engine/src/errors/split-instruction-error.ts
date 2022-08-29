export class SplitInstructionError extends Error {
  static errorConstructor: ErrorConstructor = Object.create(
    SplitInstructionError.prototype
  ).constructor

  constructor(message?: string) {
    super(message)
    Object.setPrototypeOf(this, SplitInstructionError.prototype)
  }
}
