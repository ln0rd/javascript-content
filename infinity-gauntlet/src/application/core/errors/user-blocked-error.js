import StandardError from 'framework/core/errors/standard-error'

export default class UserBlockedError extends StandardError {
  constructor(locale, timeout) {
    let minutes, seconds, complement

    if (timeout < 60) {
      complement = `${timeout} segundos`
    } else {
      minutes = Math.floor(timeout / 60)
      seconds = timeout - minutes * 60

      if (seconds) {
        complement = `${minutes} minutos e ${seconds} ${
          seconds > 1 ? 'segundos' : 'segundo'
        }`
      } else {
        complement = `${minutes} minutos`
      }
    }

    super(401, 'errors.user_blocked', locale, complement)
  }
}
