import StandardError from 'framework/core/errors/standard-error'

export default class InvalidCredentialsError extends StandardError {
  constructor(locale, attempts) {
    super(
      401,
      'errors.invalid_credentials',
      locale,
      `${
        attempts > 1
          ? `Restam ${attempts} tentativas`
          : `Resta ${attempts} tentativa`
      }`
    )
  }
}
