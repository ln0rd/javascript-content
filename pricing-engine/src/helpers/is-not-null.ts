function isNotNull<T>(arg: T): arg is Exclude<T, null | undefined> {
  return arg !== null && arg !== undefined
}

export default isNotNull
