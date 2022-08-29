export class RuleIntegrityError extends Error {
  static errorConstructor: ErrorConstructor = Object.create(
    RuleIntegrityError.prototype
  ).constructor

  constructor(message?: string) {
    super(message)
    Object.setPrototypeOf(this, RuleIntegrityError.prototype)
  }
}
