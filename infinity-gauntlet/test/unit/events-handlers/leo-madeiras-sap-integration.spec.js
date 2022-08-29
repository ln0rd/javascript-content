import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import forEach from 'mocha-each'
import sinon from 'sinon'
import 'sinon-mongoose'

import Company from 'application/core/models/company'
import EventSource from 'application/core/models/event-source'
import IntegrationConfig from 'application/core/models/integration-config'
import IntegrationCredential from 'application/core/models/integration-credential'
import IntegrationRequest from 'application/core/models/integration-request'
import Payable from 'application/core/models/payable'
import Transaction from 'application/core/models/transaction'
import LeoMadeirasSapHandler from 'application/events/handlers/leo-madeiras-sap-integration'
import * as sapleomadeiras from 'application/core/integrations/sapleomadeiras'

import {
  generateTransaction,
  generateCompany,
  generateIntegrationCredential,
  generateIntegrationConfig
} from 'test/fixtures'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Leo Madeiras SAP Handler event', () => {
  const locale = 'pt-BR'
  const transactionId = 1
  const company_id = 1
  const parameters = {
    event_source: '5d3f5d47385c0800074e020c',
    args: { transactionId, locale }
  }

  let companyMock
  let integrationMock
  let payableMock
  let transactionMock

  beforeEach(function() {
    sinon
      .mock(EventSource)
      .expects('findOne')
      .chain('exec')
      .resolves({
        _id: '5d3f5d47385c0800074e020c',
        name: 'transaction-registered'
      })

    integrationMock = sinon
      .mock(IntegrationCredential)
      .expects('findOne')
      .chain('exec')

    transactionMock = sinon
      .mock(Transaction)
      .expects('findOne')
      .chain('exec')

    companyMock = sinon
      .mock(Company)
      .expects('findOne')
      .chain('exec')

    payableMock = sinon
      .mock(Payable)
      .expects('find')
      .chain('exec')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('transaction not found should makes the handler throws an error', () => {
    const reject = new Error('transaction not found')
    transactionMock.rejects(reject)

    return expect(
      LeoMadeirasSapHandler.handler(parameters)
    ).to.eventually.rejectedWith(reject)
  })

  it('Leo company not found should makes the handler throws an error', () => {
    const reject = new Error('company not found')
    transactionMock.resolves(generateTransaction())
    companyMock.rejects(reject)

    return expect(
      LeoMadeirasSapHandler.handler(parameters)
    ).to.eventually.rejectedWith(reject)
  })

  it('company doesnt has split rules should returns', () => {
    transactionMock.resolves(generateTransaction())
    companyMock.resolves({ _id: company_id, default_split_rules: [] })

    return expect(
      LeoMadeirasSapHandler.handler(parameters)
    ).to.eventually.be.equal(undefined)
  })

  forEach([
    ['processing'],
    ['authorized'],
    ['pending_refund'],
    ['chargedback'],
    ['waiting_payment'],
    ['refused']
  ]).it(
    'transaction status different of paid or refund should returns',
    status => {
      transactionMock.resolves(
        generateTransaction(undefined, undefined, status)
      )
      companyMock.resolves({ _id: company_id })

      return expect(
        LeoMadeirasSapHandler.handler(parameters)
      ).to.eventually.be.equal(undefined)
    }
  )

  it('company integration not found should makes the handler throws an error', () => {
    const reject = new Error('integration credential not found')
    transactionMock.resolves(generateTransaction())
    companyMock.resolves(generateCompany())
    integrationMock.rejects(reject)

    return expect(
      LeoMadeirasSapHandler.handler(parameters)
    ).to.eventually.rejectedWith(reject)
  })

  forEach([
    [
      [{ cost: 2, amount: 10 }, { cost: 3, amount: 15 }],
      { firstInstallment: 15, taxes: 5 }
    ],
    [[{ cost: 2, amount: 10 }], { firstInstallment: 10, taxes: 2 }]
  ]).it(
    'getFirstInstallmentAndTaxes should returns expected values',
    async (mock, returns) => {
      payableMock.resolves(mock)

      const values = await LeoMadeirasSapHandler.getFirstInstallmentAndTaxes(
        generateTransaction()
      )
      expect(values).deep.equal(returns)
    }
  )

  it('getLeoAmount should throw error if split_rules is empty', () => {
    expect(() => LeoMadeirasSapHandler.getLeoAmount({ _id: 1 })).throws(
      'Missing split rule for transaction 1'
    )
  })

  forEach([
    [
      {
        company_id: 1,
        split_rules: [
          { company_id: 1, amount: 70 },
          { company_id: 2, amount: 30 }
        ]
      },
      30
    ],
    [
      {
        company_id: 1,
        split_rules: [
          { company_id: 1, amount: 60 },
          { company_id: 2, amount: 25 },
          { company_id: 3, amount: 15 }
        ]
      },
      25
    ]
  ]).it(
    'getLeoAmount should return the correct amount',
    (transaction, leoAmount) => {
      expect(LeoMadeirasSapHandler.getLeoAmount(transaction)).equal(leoAmount)
    }
  )

  it('bridge should send correct values to Leo SAP Integration', async () => {
    const processIntegration = sinon.stub(sapleomadeiras, 'processIntegration')
    const credentials = generateIntegrationConfig()
    const transaction = generateTransaction()
    const integration = generateIntegrationCredential()
    const company = generateCompany()

    sinon
      .mock(IntegrationConfig)
      .expects('findOne')
      .chain('exec')
      .resolves(credentials)
    sinon
      .mock(IntegrationRequest)
      .expects('create')
      .resolves(true)

    processIntegration.resolves({})
    transactionMock.resolves(transaction)
    companyMock.resolves(company)
    payableMock.resolves([{ cost: 2, amount: 10 }])
    integrationMock.resolves(integration)

    await LeoMadeirasSapHandler.handler(parameters)

    expect(processIntegration.called).to.be.true

    const { args } = processIntegration.getCall(0)

    expect(args[0]).equal(locale)
    expect(args[1]).equal(credentials.variables)
    expect(args[2]).equal(integration)
    expect(args[3]).deep.equal({
      document_type: 'cnpj',
      document_number: '14714840000120',
      is_refund: false,
      transaction: {
        id: transaction._id.toString(),
        created_at: '2017-07-14T17:27:39.744Z',
        total_amount: 100,
        leo_amount: 70,
        installments: 1,
        provider: 'hash',
        provider_transaction_id: transaction.provider_transaction_id,
        brand: 'visa',
        nsu: transaction.nsu,
        firstInstallment: 10,
        taxes: 2,
        paymentMethod: 'credit_card'
      }
    })
  })

  it('bridge should send correct values to Leo SAP Integration even if it is boleto transaction', async () => {
    const processIntegration = sinon.stub(sapleomadeiras, 'processIntegration')
    const credentials = generateIntegrationConfig()
    const transaction = Object.assign(generateTransaction(), {
      payment_method: 'boleto'
    })
    delete transaction.card

    const integration = generateIntegrationCredential()
    const company = generateCompany()

    sinon
      .mock(IntegrationConfig)
      .expects('findOne')
      .chain('exec')
      .resolves(credentials)
    sinon
      .mock(IntegrationRequest)
      .expects('create')
      .resolves(true)

    processIntegration.resolves({})
    transactionMock.resolves(transaction)
    companyMock.resolves(company)
    payableMock.resolves([{ cost: 2, amount: 10 }])
    integrationMock.resolves(integration)

    await LeoMadeirasSapHandler.handler(parameters)

    expect(processIntegration.called).to.be.true

    const { args } = processIntegration.getCall(0)

    expect(args[0]).equal(locale)
    expect(args[1]).equal(credentials.variables)
    expect(args[2]).equal(integration)
    expect(args[3]).deep.equal({
      document_type: 'cnpj',
      document_number: '14714840000120',
      is_refund: false,
      transaction: {
        id: transaction._id.toString(),
        created_at: '2017-07-14T17:27:39.744Z',
        total_amount: 100,
        leo_amount: 70,
        installments: 1,
        provider: 'hash',
        provider_transaction_id: transaction.provider_transaction_id,
        brand: 'mastercard',
        nsu: transaction.nsu,
        firstInstallment: 10,
        taxes: 2,
        paymentMethod: 'debit_card'
      }
    })
  })
})
