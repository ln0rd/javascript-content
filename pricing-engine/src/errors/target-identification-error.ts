export class TargetIdentificationError extends Error {
  static errorConstructor: ErrorConstructor = Object.create(
    TargetIdentificationError.prototype
  ).constructor

  constructor(message?: string) {
    super(message)
    Object.setPrototypeOf(this, TargetIdentificationError.prototype)
  }
}
