export const isPostgresError = (error: { code?: string }): boolean => {
  return !!error.code
}
