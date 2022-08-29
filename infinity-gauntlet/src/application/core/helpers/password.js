import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { generate } from 'generate-password'
import config from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'
import User from 'application/core/models/user'

const saltRounds = 10

export const Logger = createLogger({ name: 'PASSWORD_LOGGER' })

export const isBcrypt = password => password.startsWith('$')

export const checkPasswordV2 = (rawPassword, password) =>
  bcrypt.compareSync(rawPassword, password)

export const encryptPasswordV2 = password =>
  bcrypt.hashSync(password, saltRounds)

export const encryptPassword = encryptPasswordV2

export function checkPassword(password, rawPassword) {
  if (isBcrypt(password)) {
    return checkPasswordV2(rawPassword, password)
  }
  return (
    password ===
    crypto
      .createHash('sha1')
      .update(rawPassword)
      .digest('hex')
  )
}

const updatePasswordToV2 = async (user, password) => {
  try {
    const newHash = encryptPasswordV2(password)
    await User.updateOne(
      { _id: user._id },
      { $set: { password_hash: newHash } }
    )
    Logger.info({ _id: user._id }, 'password-cryptography-updated')
  } catch (err) {
    Logger.error(
      { _id: user._id, message: err.message },
      'fail-password-cryptography-update'
    )
  }
  return true
}

export function checkPasswordAndUpdate(user, password) {
  const passwordIsValid = checkPassword(user.password_hash, password)
  if (!passwordIsValid) {
    return false
  }
  if (isBcrypt(user.password_hash)) {
    return true
  }
  return updatePasswordToV2(user, password)
}

export function generateRandomPassword(minLength) {
  const conf = config.password

  return generate({
    length: conf.min_length || minLength,
    numbers: conf.include_numbers,
    symbols: conf.include_symbols,
    lowercase: conf.include_lower_case,
    uppercase: conf.include_upper_case,
    excludeSimilarCharacters: conf.exclude_similar,
    strict: conf.strict
  })
}
