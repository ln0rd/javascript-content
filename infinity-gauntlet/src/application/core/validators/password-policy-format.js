export default {
  name: 'password_policy',
  type: 'format',
  handler: value => {
    const containsNumber = password => /\d/.test(password)
    const containsLowerCase = password => /[a-z]/.test(password)
    const containsUpperCase = password => /[A-Z]/.test(password)
    const containsSpecialCharacter = password =>
      /[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(password)
    const hasMinimumLength = password => password.length >= 8

    return (
      containsNumber(value) &&
      containsLowerCase(value) &&
      containsUpperCase(value) &&
      containsSpecialCharacter(value) &&
      hasMinimumLength(value)
    )
  }
}
