import chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'

import Transaction from 'application/core/models/transaction'
import Payable from 'application/core/models/payable'
import AccountingEvent from 'application/core/models/accounting-event'

import * as PurchaseEvent from 'modules/accounting-events/application/generate-purchase-event'
import * as IsoRevenueEvent from 'modules/accounting-events/domain/generate-iso-revenue-event'
import * as HashRevenueEvent from 'modules/accounting-events/domain/generate-hash-revenue-event'
import { generateAccountingEventsFromTransaction } from 'modules/accounting-events/application/generate-accounting-events-from-transaction'

import generateTransaction from 'test/fixtures/generateTransaction'
import generatePayable from 'test/fixtures/generatePayable'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => Generate Accounting Events', () => {
  describe('when a transaction is not found', () => {
    let transactionStub
    let payablesStub
    let generatePurchaseEventSpy
    beforeEach(() => {
      transactionStub = sinon.stub(Transaction, 'findById').resolves(null)
      payablesStub = sinon.stub(Payable, 'find').resolves(null)
      generatePurchaseEventSpy = sinon.spy(
        PurchaseEvent,
        'generatePurchaseEvent'
      )
    })

    afterEach(() => {
      transactionStub.restore()
      generatePurchaseEventSpy.restore()
      payablesStub.restore()
    })

    it('should error and not call any of the event generation functions', async () => {
      await expect(
        generateAccountingEventsFromTransaction(123456)
      ).to.eventually.be.rejectedWith(
        'Cannot find transaction #123456 to generate Accounting Events from.'
      )

      return expect(generatePurchaseEventSpy.called).to.be.eq(false)
    })
  })

  describe('when a transaction is found', () => {
    let transactionStub
    let payablesStub
    let generatePurchaseEventSpy
    let isoRevenueEventSpy
    let hashRevenueEventSpy
    let accountingEventStub

    beforeEach(() => {
      const transaction = generateTransaction()
      const payables = [
        generatePayable({ transaction_id: transaction._id }),
        generatePayable({ transaction_id: transaction._id })
      ]
      transactionStub = sinon
        .stub(Transaction, 'findById')
        .resolves(transaction)

      payablesStub = sinon.stub(Payable, 'find').resolves(payables)

      accountingEventStub = sinon
        .stub(AccountingEvent, 'insertMany')
        .resolvesArg(0)

      generatePurchaseEventSpy = sinon.spy(
        PurchaseEvent,
        'generatePurchaseEvent'
      )

      isoRevenueEventSpy = sinon.spy(IsoRevenueEvent, 'generateIsoRevenueEvent')

      hashRevenueEventSpy = sinon.spy(
        HashRevenueEvent,
        'generateHashRevenueEvent'
      )
    })

    afterEach(() => {
      transactionStub.restore()
      accountingEventStub.restore()
      generatePurchaseEventSpy.restore()
      isoRevenueEventSpy.restore()
      hashRevenueEventSpy.restore()
      payablesStub.restore()
    })

    it('shouldnt error while generating the events', async () => {
      return expect(generateAccountingEventsFromTransaction(123456)).to
        .eventually.be.fulfilled
    })

    it('should generate the purchase events', async () => {
      await generateAccountingEventsFromTransaction(123456)

      return expect(generatePurchaseEventSpy.called).to.be.eq(true)
    })

    it('should try to insert the generated events', async () => {
      await generateAccountingEventsFromTransaction(123456)

      return expect(accountingEventStub.called).to.be.true
    })

    it('should have generated ISO Revenue event', async () => {
      await generateAccountingEventsFromTransaction(123456)

      return expect(isoRevenueEventSpy.called).to.be.eq(true)
    })

    it('should have generated Hash Revenue event', async () => {
      await generateAccountingEventsFromTransaction(123456)

      return expect(hashRevenueEventSpy.called).to.be.eq(true)
    })
  })
})
