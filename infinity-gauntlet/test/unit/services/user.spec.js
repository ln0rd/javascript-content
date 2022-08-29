/* eslint-disable security/detect-object-injection */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import 'sinon-mongoose'
import mongoose from 'mongoose'

import frameworkConfig from 'framework/core/config'
import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import ValidationError from 'framework/core/errors/validation-error'
import ExpiredTokenError from 'framework/core/errors/expired-token-error'
import IntegrationGenericError from 'application/core/errors/integration-generic-error'
import InvalidUserValidationStatusError from 'application/core/errors/invalid-user-validation-status-error'
import UserService from 'application/core/services/user'
import * as Mailer from 'framework/core/helpers/mailer'
import CompanyService from 'application/core/services/company'
import { userResponder } from 'application/core/responders/user'
import { encryptPassword } from 'application/core/helpers/password'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'
import * as AWS from 'application/core/helpers/aws'
import * as Idwall from 'application/core/integrations/idwall'
import applicationConfig from 'application/core/config'
import sms from '@hashlab/sms-client'
import moment from 'moment-timezone'

import {
  generateUser,
  generateUserPermissions,
  generateCompany
} from 'test/fixtures'

chai.use(chaiAsPromised)
const { expect, assert } = chai

const ObjectId = mongoose.Types.ObjectId
const locale = frameworkConfig.core.i18n.defaultLocale

describe('Remove user permission', () => {
  const companyId = ObjectId().toString()
  const userId = ObjectId().toString()

  let companyServiceStub
  let userFindOneMock

  beforeEach(function() {
    userFindOneMock = sinon
      .mock(User)
      .expects('findOne')
      .chain('select')
      .chain('exec')

    companyServiceStub = sinon.stub(CompanyService, 'removeUserFromCompany')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ModelNotFoundError if user is not found', () => {
    userFindOneMock.resolves(undefined)

    return expect(
      UserService.removePermission(locale, companyId, userId)
    ).to.eventually.rejectedWith(ModelNotFoundError)
  })

  it('Should return the original user if they do not have permissions', async () => {
    const userResponse = generateUser(null)
    userFindOneMock.resolves(userResponse)

    const userSaveSpy = sinon.spy(userResponse, 'save')
    const userReturned = await UserService.removePermission(
      locale,
      companyId,
      userId
    )

    assert.deepEqual(userResponder(userResponse), userReturned)
    sinon.assert.notCalled(companyServiceStub)
    sinon.assert.notCalled(userSaveSpy)
  })

  it('Should return the original user if they do not have the permission to remove', async () => {
    const userResponse = generateUser(undefined)
    userFindOneMock.resolves(userResponse)

    const userSaveSpy = sinon.spy(userResponse, 'save')
    const findIndexSpy = sinon.spy(userResponse.permissions, 'findIndex')

    const returnedUser = await UserService.removePermission(
      locale,
      companyId,
      userId
    )

    sinon.assert.calledOnce(findIndexSpy)
    assert.deepEqual(userResponder(userResponse), returnedUser)
    sinon.assert.notCalled(companyServiceStub)
    sinon.assert.notCalled(userSaveSpy)
  })

  it('Should remove the right permission only', async () => {
    const permissionsCount = 5
    const permissionIndexToRemove = 1

    const permissions = generateUserPermissions(permissionsCount)
    permissions[permissionIndexToRemove].company_id = companyId

    const userResponse = generateUser(permissions)
    userFindOneMock.resolves(userResponse)

    const userSaveSpy = sinon.spy(userResponse, 'save')
    const permissionsSpliceSpy = sinon.spy(permissions, 'splice')
    const returnedUsed = await UserService.removePermission(
      locale,
      companyId,
      userId
    )

    expect(returnedUsed.permissions.length).to.equal(permissionsCount - 1)
    expect(
      returnedUsed.permissions.some(
        permission => permission.company_id === companyId
      )
    ).to.be.false
    sinon.assert.calledWithExactly(
      companyServiceStub,
      locale,
      companyId,
      userId
    )
    sinon.assert.calledOnce(userSaveSpy)
    sinon.assert.calledWithExactly(
      permissionsSpliceSpy,
      permissionIndexToRemove,
      1
    )
  })
})

describe('Activate User', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  let userFindOneMock

  beforeEach(() => {
    userFindOneMock = sinon.mock(User).expects('findOne')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ValidationError if password does not meet policy', () => {
    const params = {
      token: '64ca5f474e964886b4ed36259f52adfc',
      password: 'thisisnotavalidpassword'
    }

    return expect(
      UserService.activateUser(locale, params)
    ).to.eventually.rejectedWith(ValidationError)
  })

  it('Should activate user when password meets policy', async () => {
    const user = {
      _id: mongoose.Types.ObjectId(),
      status: 'pending_confirmation'
    }
    user.save = () => user
    userFindOneMock.resolves(user)

    const params = {
      token: '64ca5f474e964886b4ed36259f52adfc',
      password: 'P4ssword123$'
    }

    const resp = await UserService.activateUser(locale, params)
    assert.equal(resp.status, 'active')
  })
})

describe('Create user onboarding report and set validation_status status to processing', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  let userFindOneMock

  beforeEach(() => {
    userFindOneMock = sinon.mock(User).expects('findOne')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ModelNotFoundError if user is not found', () => {
    const userId = mongoose.Types.ObjectId().toString()
    const params = {
      company_id: 'hash',
      sdk_token: 'sdk-random-uuid4-string',
      matrix_name: 'sdk_matrix_name'
    }

    userFindOneMock.resolves(undefined)

    return expect(
      UserService.onboardingValidation(locale, userId, params)
    ).to.eventually.rejectedWith(ModelNotFoundError)
  })

  const invalid_params = [
    [
      {
        sdk_token: 'sdk-random-uuid4-string',
        matrix_name: 'sdk_matrix_name'
      },
      'company_id'
    ],
    [
      {
        company_id: 'hash',
        matrix_name: 'sdk_matrix_name'
      },
      'sdk_token'
    ],
    [
      {
        company_id: 'hash',
        sdk_token: 'sdk-random-uuid4-string'
      },
      'matrix_name'
    ]
  ]
  invalid_params.forEach(([params, missing_parameter]) => {
    it(`Should throw ValidationError if params does not contain ${missing_parameter} property`, () => {
      const userId = mongoose.Types.ObjectId().toString()
      return expect(
        UserService.onboardingValidation(locale, userId, params)
      ).to.eventually.rejectedWith(
        ValidationError,
        `O paramêtro ${missing_parameter} é obrigatório.`
      )
    })
  })

  it('Should throw InvalidUserValidationStatusError if user validation_status is invalid', async () => {
    let user = generateUser()
    user.validation_status = 'processing'
    user.save = () => user

    const userId = user._id.toString()
    const params = {
      company_id: 'hash',
      sdk_token: 'sdk-random-uuid4-string',
      matrix_name: 'sdk_matrix_name'
    }

    userFindOneMock.resolves(user)

    return expect(
      UserService.onboardingValidation(locale, userId, params)
    ).to.eventually.rejectedWith(InvalidUserValidationStatusError)
  })

  it('Should throw IntegrationGenericError if createIdwallReport fails', async () => {
    let user = generateUser()
    user.save = () => user

    const userId = user._id.toString()
    const params = {
      company_id: 'hash',
      sdk_token: 'sdk-random-uuid4-string',
      matrix_name: 'sdk_matrix_name'
    }

    userFindOneMock.resolves(user)

    const mock_error = new Error()
    mock_error.config = {
      baseURL: 'https://api-v2.idwall.co',
      url: 'https://api-v2.idwall.co/relatorios',
      method: 'POST',
      headers: null, // sensitive data (API Key)
      params: null,
      data: {
        matriz: params.matrix_name,
        parametros: {
          token_sdk: params.sdk_token
        }
      }
    }

    sinon
      .stub(Idwall, 'createIdwallReport')
      .throws(new IntegrationGenericError(locale, mock_error, 'idwall'))

    return expect(
      UserService.onboardingValidation(locale, userId, params)
    ).to.eventually.rejectedWith(IntegrationGenericError)
  })

  it("Should set user validation_status to 'processing' on success", async () => {
    let user = generateUser()
    user.save = () => user

    const userId = user._id.toString()
    const params = {
      company_id: 'hash',
      sdk_token: 'sdk-random-uuid4-string',
      matrix_name: 'sdk_matrix_name'
    }

    userFindOneMock.resolves(user)

    sinon.stub(Idwall, 'createIdwallReport').returns({
      result: {
        numero: 'random-uuid4-string'
      },
      status_code: 200
    })

    const response = await UserService.onboardingValidation(
      locale,
      userId,
      params
    )

    assert.equal(response.validation_status, 'processing')
  })
})

describe('Update user validation status', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  let userFindOneMock

  beforeEach(() => {
    userFindOneMock = sinon.mock(User).expects('findOne')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ModelNotFoundError if user is not found', () => {
    const userId = mongoose.Types.ObjectId()
    const params = { validation_status: 'approved' }

    userFindOneMock.resolves(undefined)

    return expect(
      UserService.updateValidationStatus(locale, userId, params)
    ).to.eventually.rejectedWith(ModelNotFoundError)
  })

  it('Should throw ValidationError if params does not contain validation_status property', () => {
    const userId = mongoose.Types.ObjectId()
    const params = {}

    return expect(
      UserService.updateValidationStatus(locale, userId, params)
    ).to.eventually.rejectedWith(ValidationError)
  })

  it('Should update user validation_status on success', async () => {
    let user = generateUser()
    user.save = () => user

    userFindOneMock.resolves(user)

    const expected_status = 'approved'
    const params = { validation_status: expected_status }

    const response = await UserService.updateValidationStatus(
      locale,
      user._id,
      params
    )
    assert.equal(response.validation_status, expected_status)
  })
})

describe('Update user password', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  let userFindOneMock

  beforeEach(() => {
    userFindOneMock = sinon.mock(User).expects('findOne')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ValidationError if new password does not meet policy', () => {
    const params = {
      current_password: 'senhainsegura',
      new_password: 'thisisnotavalidpassword'
    }

    return expect(
      UserService.updatePassword(locale, params, '', '')
    ).to.eventually.rejectedWith(ValidationError)
  })

  it('Should update password when it meets policy', async () => {
    const user = {
      _id: mongoose.Types.ObjectId(),
      status: 'pending_confirmation',
      password_hash: encryptPassword('previouspassword')
    }

    user.save = () => {
      user.save_called = true
      user.saved_password = user.password_hash
      user.password_bcrypt_defined_by_user = true
      return user
    }

    userFindOneMock.resolves(user)

    const params = {
      current_password: 'previouspassword',
      new_password: 'P4ssword123$'
    }

    await UserService.updatePassword(locale, params, user._id, user._id)
    assert.isTrue(user.save_called)
    assert.isTrue(user.password_bcrypt_defined_by_user)
    assert.isTrue(user.password_hash.startsWith('$'))
  })
})

describe('Password reset flow', () => {
  afterEach(() => {
    sinon.restore()
  })

  context('Token generation', () => {
    const params = {
      recovery_method: 'email',
      email: 'hash@hash.com.br',
      target: 'https://hash-test.hashboard.com.br'
    }

    let userUpdateMock
    let mailerMock
    let smsClientMock

    beforeEach(async () => {
      const parentCompany = generateCompany()
      const company = generateCompany()
      company.parent_id = parentCompany._id
      const permissions = generateUserPermissions(3)
      permissions[0].company_id = company._id
      const user = generateUser(permissions)

      sinon
        .mock(User)
        .expects('findOne')
        .chain('exec')
        .resolves(user)

      sinon
        .mock(Company)
        .expects('findOne')
        .twice()
        .chain('exec')
        .twice()
        .resolves(company)
        .resolves(parentCompany)

      userUpdateMock = sinon
        .mock(User)
        .expects('updateOne')
        .withArgs({ _id: user._id }, sinon.match.any)

      sinon
        .stub(AWS, 's3GetHashboardFile')
        .returns({ 'hash-test': 'hash-test', 'dominio.com.br': 'hash-test' })

      mailerMock = sinon.stub(Mailer, 'scheduleToDeliver').returns()

      smsClientMock = sinon
        .stub(sms, 'createSmsClient')
        .returns({ sendSms: () => {} })
    })

    it('Should throw ValidationError when params are invalid', async () => {
      const invalidParams = {
        recovery_method: 'error',
        email: 'error@error.com'
      }
      return expect(
        UserService.applyPasswordResetToken(locale, invalidParams)
      ).to.eventually.rejectedWith(ValidationError)
    })

    it('Should throw a ValidationError if target is missing', async () => {
      const invalidParams = Object.assign(params, { target: undefined })
      return expect(
        UserService.applyPasswordResetToken(locale, invalidParams)
      ).to.eventually.rejectedWith(ValidationError)
    })

    it('Should throw UnauthorizedError when custom target is not whitelisted', async () => {
      const invalidParams = Object.assign(params, {
        target: 'https://hash-test-error.com.br'
      })
      return expect(
        UserService.applyPasswordResetToken(locale, invalidParams)
      ).to.eventually.rejectedWith(UnauthorizedError)
    })

    it('Should throw UnauthorizedError when iso key target is not whitelisted', async () => {
      const invalidParams = Object.assign(params, {
        target: 'https://hash-test-error.hashboard.com.br'
      })
      return expect(
        UserService.applyPasswordResetToken(locale, invalidParams)
      ).to.eventually.rejectedWith(UnauthorizedError)
    })

    it('Should also work with whitelisted customized URLs', async () => {
      const myParams = Object.assign(params, {
        target: 'https://dominio.com.br'
      })
      await UserService.applyPasswordResetToken(locale, myParams)
      sinon.assert.calledOnce(mailerMock)
    })

    it('Should update reset_password_token and reset_password_token_expires_at', async () => {
      await UserService.applyPasswordResetToken(locale, params)
      sinon.assert.calledOnce(userUpdateMock)
    })

    it('Should use email client when method is email', async () => {
      await UserService.applyPasswordResetToken(locale, params)
      sinon.assert.calledOnce(mailerMock)
    })

    it('Should use sms client when method is sms', async () => {
      const smsParams = Object.assign(params, { recovery_method: 'sms' })
      await UserService.applyPasswordResetToken(locale, smsParams)
      sinon.assert.calledOnce(smsClientMock)
    })
  })

  context('Password reset', () => {
    let userMock
    const validParams = {
      password: '%aBl192837465',
      token: '1234abcd'
    }

    beforeEach(async () => {
      userMock = sinon
        .mock(User)
        .expects('findOne')
        .chain('exec')
    })

    it('Should throw a ValidationError if password is not strong enough', async () => {
      const params = {
        password: 'weak',
        token: '123abc'
      }

      return expect(
        UserService.resetPasswordViaToken(locale, params)
      ).to.eventually.rejectedWith(ValidationError)
    })

    it('Should throw a ValidationError if password is missing', async () => {
      return expect(
        UserService.resetPasswordViaToken(locale, { token: 'abc123' })
      ).to.eventually.rejectedWith(ValidationError)
    })

    it('Should throw a ValidationError if token is missing', async () => {
      return expect(
        UserService.resetPasswordViaToken(locale, { password: '%aBl192837465' })
      ).to.eventually.rejectedWith(ValidationError)
    })

    it('Should not update if reset_password_token_expires_at is past due', async () => {
      const user = generateUser()
      user.reset_password_token = validParams.token
      user.reset_password_token_expires_at = moment()
        .tz(applicationConfig.timezone)
        .subtract(1, 'hours')
      userMock.resolves(user)
      const saveSpy = sinon.spy(user, 'save')
      sinon.assert.notCalled(saveSpy)

      return expect(
        UserService.resetPasswordViaToken(locale, validParams)
      ).to.eventually.rejectedWith(ExpiredTokenError)
    })

    it('Should update if reset_password_token_expires_at is not past due', async () => {
      const user = generateUser()
      user.reset_password_token = validParams.token
      user.reset_password_token_expires_at = moment()
        .tz(applicationConfig.timezone)
        .add(1, 'hours')
      userMock.resolves(user)
      const saveSpy = sinon.spy(user, 'save')

      await UserService.resetPasswordViaToken(locale, validParams)
      sinon.assert.calledOnce(saveSpy)
    })
  })
})
