function throwIf(
  condition: boolean,
  message: string,
  ErrorType: ErrorConstructor = Error
): void {
  if (condition) {
    throw new ErrorType(message)
  }
}

export default throwIf
