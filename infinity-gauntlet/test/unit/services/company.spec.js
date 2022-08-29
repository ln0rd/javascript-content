/* eslint-disable security/detect-object-injection */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import 'sinon-mongoose'
import mongoose from 'mongoose'

import frameworkConfig from 'framework/core/config'
import Company from 'application/core/models/company'
import User from 'application/core/models/user'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import ValidationError from 'framework/core/errors/validation-error'
import CompanyService from 'application/core/services/company'
import * as deliverer from 'application/webhook/helpers/deliverer'

import { generateCompany, generateUser } from 'test/fixtures'

chai.use(chaiAsPromised)
const { expect } = chai

const ObjectId = mongoose.Types.ObjectId

describe('Remove user from company', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  const companyId = ObjectId().toString()
  const userId = ObjectId().toString()

  let companyFindOneMock

  beforeEach(function() {
    companyFindOneMock = sinon
      .mock(Company)
      .expects('findOne')
      .chain('select')
      .chain('exec')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ModelNotFoundError if company is not found', () => {
    companyFindOneMock.resolves(undefined)

    return expect(
      CompanyService.removeUserFromCompany(locale, companyId, userId)
    ).to.eventually.rejectedWith(ModelNotFoundError)
  })

  it('Should do nothing if there are no users', async () => {
    const companyResponse = generateCompany()
    delete companyResponse.users
    companyFindOneMock.resolves(companyResponse)

    const companySaveSpy = sinon.spy(companyResponse, 'save')

    await CompanyService.removeUserFromCompany(locale, companyId, userId)

    sinon.assert.notCalled(companySaveSpy)
  })

  it("Shouldn't change company's users if they are not found", async () => {
    const users = [ObjectId(), ObjectId(), ObjectId()]
    const companyResponse = generateCompany(companyId, users)
    companyFindOneMock.resolves(companyResponse)

    const companySaveSpy = sinon.spy(companyResponse, 'save')

    const findIndexSpy = sinon.spy(companyResponse.users, 'findIndex')
    const spliceSpy = sinon.spy(companyResponse.users, 'splice')

    await CompanyService.removeUserFromCompany(locale, companyId, userId)

    sinon.assert.notCalled(companySaveSpy)
    sinon.assert.notCalled(spliceSpy)
    sinon.assert.calledOnce(findIndexSpy)
    expect(companyResponse.users.length).to.equal(3)
  })

  it('Should remove the specified user only', async () => {
    const users = [ObjectId(), ObjectId(userId), ObjectId()]
    const companyResponse = generateCompany(companyId, users)
    companyFindOneMock.resolves(companyResponse)

    const companySaveSpy = sinon.spy(companyResponse, 'save')

    const findIndexSpy = sinon.spy(companyResponse.users, 'findIndex')
    const spliceSpy = sinon.spy(companyResponse.users, 'splice')

    await CompanyService.removeUserFromCompany(locale, companyId, userId)

    sinon.assert.calledOnce(companySaveSpy)
    sinon.assert.calledWithExactly(spliceSpy, 1, 1)
    sinon.assert.calledOnce(findIndexSpy)
    expect(companyResponse.users.length).to.equal(2)
  })
})

describe('Update company status', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  const companyId = ObjectId().toString()

  let companyFindOneMock

  beforeEach(function() {
    companyFindOneMock = sinon.mock(Company).expects('findOne')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('Should throw ModelNotFoundError if company is not found', () => {
    companyFindOneMock.resolves(undefined)
    let params = { status: 'rejected' }

    return expect(
      CompanyService.updateCompanyStatus(locale, params, companyId)
    ).to.eventually.rejectedWith(ModelNotFoundError)
  })

  it('Should throw ValidationError if status value is invalid', () => {
    const companyResponse = generateCompany({ id: companyId })
    companyFindOneMock.resolves(companyResponse)
    let params = { status: 'batata' }

    return expect(
      CompanyService.updateCompanyStatus(locale, params, companyId)
    ).to.eventually.rejectedWith(ValidationError)
  })
  ;[
    'pending_approval',
    'approved',
    'rejected',
    'canceled',
    'blocked',
    'revoked',
    'inactive'
  ].forEach(status => {
    it(`Should update statusV2 with valid status ${status}`, async () => {
      const companyResponse = generateCompany({ id: companyId })
      companyFindOneMock.resolves(companyResponse)
      let params = { status: status }

      const companySaveSpy = sinon.spy(companyResponse, 'save')
      await CompanyService.updateCompanyStatus(locale, params, companyId)

      sinon.assert.calledOnce(companySaveSpy)
      chai.assert.equal(companyResponse.statusV2, status)
    })
  })

  it('Should add statusV2 if it is not present yet', async () => {
    let companyResponse = generateCompany({ id: companyId })
    delete companyResponse.statusV2
    companyFindOneMock.resolves(companyResponse)

    let params = { status: 'approved' }
    const companySaveSpy = sinon.spy(companyResponse, 'save')
    await CompanyService.updateCompanyStatus(locale, params, companyId)

    sinon.assert.calledOnce(companySaveSpy)
    chai.assert.equal(companyResponse.statusV2, 'approved')
  })

  it('Should call notifyCompanyStatusChange after save', async () => {
    let companyResponse = generateCompany({ id: companyId })
    delete companyResponse.statusV2
    companyFindOneMock.resolves(companyResponse)

    let params = { status: 'approved' }
    const companySaveSpy = sinon.spy(companyResponse, 'save')
    const notifySpy = sinon.spy(CompanyService, 'notifyCompanyStatusChange')
    await CompanyService.updateCompanyStatus(locale, params, companyId)

    sinon.assert.calledOnce(companySaveSpy)
    chai.assert.equal(companyResponse.statusV2, 'approved')

    sinon.assert.calledWith(
      notifySpy,
      companyResponse,
      'pending_approval',
      'approved'
    )
  })
})

describe('Create company', () => {
  const locale = frameworkConfig.core.i18n.defaultLocale
  const company = generateCompany({ id: ObjectId().toString() })
  company.bank_account = {}
  company.email = 'hash@hash.com.br'

  afterEach(() => {
    sinon.restore()
  })
  ;[
    [{}, 'required fields empty'],
    [
      {
        bank_code: '232',
        agencia: '1234',
        conta: '2',
        document_type: 'rg',
        document_number: '58478545214'
      },
      'enum value incorrect'
    ],
    [
      {
        bank_code: '2w2',
        agencia: '123s',
        conta: '2f',
        conta_dv: 'a',
        document_type: 'cpf',
        document_number: '02578908079'
      },
      'numeric string incorrect'
    ],
    [
      {
        bank_code: '123',
        agencia: '1234',
        conta: '23425147841254125478',
        document_type: 'cpf',
        document_number: '15806908070'
      },
      'conta maxLength incorrect'
    ],
    [
      {
        bank_code: '123',
        agencia: '1234',
        conta: '2342514784125412547',
        conta_dv: '23',
        document_type: 'cpf',
        document_number: '15806908070'
      },
      'conta_dv maxLength incorrect'
    ],
    [
      {
        bank_code: '224',
        agencia: '1234',
        conta: '1254',
        document_type: 'cnpj',
        document_number: '125478956214'
      },
      'document_type equal cpnj but document_number incorrect'
    ],
    [
      {
        bank_code: '232',
        agencia: '1234',
        conta: '1254',
        document_type: 'cpf',
        document_number: '1025478956'
      },
      'document_type equal cpf but document_number incorrect'
    ],
    [
      {
        bank_code: '232',
        agencia: '1234',
        agencia_dv: '2',
        conta: '1118382',
        conta_dv: '9',
        document_number: '502472590001005'
      },
      'document_number maxLength incorrect'
    ],
    [
      {
        bank_code: '232',
        agencia: '1234',
        agencia_dv: '2',
        conta: '1118382',
        conta_dv: '9',
        document_number: '102547895'
      },
      'document_number minLength incorrect'
    ]
  ].forEach(([bank_account, scenario]) => {
    it(`should not create company with ${scenario}`, () => {
      company.bank_account = bank_account
      return expect(
        CompanyService.create(locale, company)
      ).to.eventually.rejectedWith(
        ValidationError,
        'O paramêtro bank_account não é válido.'
      )
    })
  })
  ;[
    [
      {
        bank_code: '232',
        agencia: '1234',
        conta: '1118382',
        conta_dv: '9',
        document_type: 'cpf',
        document_number: '79452491086'
      },
      'cpf document'
    ],
    [
      {
        bank_code: '232',
        agencia: '1234',
        agencia_dv: '2',
        conta: '1118382',
        conta_dv: '9',
        document_type: 'cnpj',
        document_number: '50247259000100'
      },
      'cnpj document'
    ],
    [
      {
        bank_code: '232',
        agencia: '1234',
        agencia_dv: '2',
        conta: '1118382',
        conta_dv: '9',
        document_number: '50247259000100'
      },
      'without document_type'
    ]
  ].forEach(([bank_account, scenario]) => {
    it(`should create company with ${scenario}`, async () => {
      company.document_number = bank_account.document_number
      company.document_type = bank_account.document_type
      company.bank_account = bank_account
      delete company.parent_id
      delete company.mcc

      const companyCreateMock = sinon
        .mock(Company)
        .expects('create')
        .resolves(company)
      const user = generateUser()
      const userFindMock = sinon
        .mock(User)
        .expects('findOne')
        .resolves(user)
      const userSaveSpy = sinon.spy(user, 'save')
      const companySaveSpy = sinon.spy(company, 'save')

      await CompanyService.create(locale, company)

      sinon.assert.calledOnce(companyCreateMock)
      sinon.assert.calledOnce(userFindMock)
      sinon.assert.calledOnce(userSaveSpy)
      sinon.assert.calledOnce(companySaveSpy)
    })
  })
})

describe('Notify company status change', () => {
  const companyId = ObjectId().toString()
  const parentId = ObjectId().toString()

  afterEach(() => {
    sinon.restore()
  })

  it('Should not send webhook when company have no parent', async () => {
    let parentResponse = generateCompany({ id: parentId })
    parentResponse.parent_id = ''

    const sendWebhookSpy = sinon.spy(deliverer, 'default')
    await CompanyService.notifyCompanyStatusChange(
      parentResponse,
      'pending_approval',
      'rejected'
    )

    sinon.assert.notCalled(sendWebhookSpy)
  })
  ;[
    ['pending_approval', 'approved'],
    ['pending_approval', 'rejected'],
    ['pending_approval', 'canceled'],
    ['approved', 'rejected'],
    ['approved', 'canceled'],
    ['approved', 'pending_approval'],
    ['rejected', 'approved'],
    ['rejected', 'canceled'],
    ['rejected', 'pending_approval'],
    ['canceled', 'approved'],
    ['canceled', 'rejected'],
    ['canceled', 'pending_approval']
  ].forEach(pair => {
    it('Should send webhook when company has parent', async () => {
      let companyResponse = generateCompany({ id: companyId })
      companyResponse.parent_id = parentId
      const sendWebhookStub = sinon.stub(deliverer, 'default')

      const [previous, next] = pair
      await CompanyService.notifyCompanyStatusChange(
        companyResponse,
        previous,
        next
      )

      sinon.assert.calledWith(
        sendWebhookStub,
        parentId,
        'company_status_updated',
        'company',
        companyResponse._id,
        previous,
        next
      )
    })
  })
})
