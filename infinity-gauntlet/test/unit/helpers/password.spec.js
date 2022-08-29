import { expect } from 'chai'
import {
  encryptPassword,
  checkPassword,
  isBcrypt
} from 'application/core/helpers/password'

describe('Unit => Helpers: Password', function() {
  const sha1Hash = '7110eda4d09e062aa5e4a390b0a572ac0d2c0220'
  const bcryptHash =
    '$2b$10$RJkycLBG.eVGxFbkMYMfZ.3PuCj3DEW/owDkS4vBHYPRKJy7tQTX.'
  const validPassword = '1234'
  const invalidPassword = '12345'

  it('encryptPassword returns bcrypt hash', async () => {
    const newHash = encryptPassword(validPassword)
    expect(newHash.startsWith('$')).to.be.true
  })

  context('isBcrypt', () => {
    it('return true with bcrypt hash', () => {
      expect(isBcrypt(bcryptHash)).to.be.true
    })
    it('return false with sha1 hash', () => {
      expect(isBcrypt(sha1Hash)).to.be.false
    })
  })

  context('checkPassword', () => {
    it('return true with valid sha1 password', () => {
      const passwordShouldBeValid = checkPassword(sha1Hash, validPassword)
      expect(passwordShouldBeValid).to.be.true
    })
    it('return false with invalid sha1 password', () => {
      const passwordShouldBeInvalid = checkPassword(sha1Hash, invalidPassword)
      expect(passwordShouldBeInvalid).to.be.false
    })

    it('return true with valid bcrypt password', () => {
      const passwordShouldBeValid = checkPassword(bcryptHash, validPassword)
      expect(passwordShouldBeValid).to.be.true
    })
    it('return false with invalid bcrypt password', () => {
      const passwordShouldBeInvalid = checkPassword(bcryptHash, invalidPassword)
      expect(passwordShouldBeInvalid).to.be.false
    })
  })
})
