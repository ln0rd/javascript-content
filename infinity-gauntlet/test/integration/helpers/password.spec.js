import { expect } from 'chai'
import {
  checkPasswordAndUpdate,
  isBcrypt,
  Logger
} from 'application/core/helpers/password'
import User from 'application/core/models/user'
import mongoose from 'mongoose'
import faker from 'faker'
import sinon from 'sinon'

describe('Integration => Helpers: Password', function() {
  const sha1Hash = '7110eda4d09e062aa5e4a390b0a572ac0d2c0220'
  const ObjectId = mongoose.Types.ObjectId
  const bcryptHash =
    '$2b$10$RJkycLBG.eVGxFbkMYMfZ.3PuCj3DEW/owDkS4vBHYPRKJy7tQTX.'
  const validPassword = '1234'
  const invalidPassword = '12345'
  let spyLogInfo

  const createUser = async password => {
    const user = {
      _id: ObjectId(),
      password_hash: password,
      name: faker.name.findName(),
      email: faker.internet.email()
    }
    return User.create(user)
  }

  const findUser = async id => {
    return User.findOne({ _id: id })
  }

  context('checkPasswordAndUpdate => works with sha1 and bcrypt', () => {
    after(async () => {
      await Promise.all([User.collection.drop()])
      sinon.restore()
    })

    context('sha1 password', () => {
      it('return true with valid password and update password', async () => {
        spyLogInfo = sinon.spy(Logger, 'info')

        const user = await createUser(sha1Hash)
        const passwordShouldBeValid = await checkPasswordAndUpdate(
          user,
          validPassword
        )

        expect(passwordShouldBeValid).to.be.true

        sinon.assert.calledWith(
          spyLogInfo,
          sinon.match({ _id: user._id }),
          'password-cryptography-updated'
        )

        const userUpdated = await findUser(user._id)
        expect(isBcrypt(userUpdated.password_hash)).to.be.true
      })

      it('return false with invalid password and not update password', async () => {
        const user = await createUser(sha1Hash)
        const passwordShouldBeInvalid = await checkPasswordAndUpdate(
          user,
          invalidPassword
        )

        expect(passwordShouldBeInvalid).to.be.false

        const userStored = await findUser(user._id)
        expect(isBcrypt(userStored.password_hash)).to.be.false
        expect(userStored.password_hash).to.be.equal(user.password_hash)
      })
    })

    context('bcrypt password', () => {
      let user

      const assertUserBcryptPasswordNotUpdate = async user => {
        const userStored = await findUser(user._id)
        expect(isBcrypt(userStored.password_hash)).to.be.true
        expect(userStored.password_hash).to.be.equal(user.password_hash)
      }

      before(async () => {
        user = await createUser(bcryptHash)
      })

      it('return true with valid password and not update password', async () => {
        const passwordShouldBeValid = await checkPasswordAndUpdate(
          user,
          validPassword
        )

        expect(passwordShouldBeValid).to.be.true
        await assertUserBcryptPasswordNotUpdate(user)
      })

      it('return false with invalid password', async () => {
        const passwordShouldBeInvalid = await checkPasswordAndUpdate(
          user,
          invalidPassword
        )

        expect(passwordShouldBeInvalid).to.be.false
        await assertUserBcryptPasswordNotUpdate(user)
      })
    })
  })
})
