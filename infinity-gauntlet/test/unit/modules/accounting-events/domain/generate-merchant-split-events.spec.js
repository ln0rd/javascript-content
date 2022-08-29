import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import AccountingEvent from 'application/core/models/accounting-event'
import generateTransaction from 'test/fixtures/generateTransaction'
import generatePayable from 'test/fixtures/generatePayable'
import { generateMerchantSplitEvents } from 'modules/accounting-events/domain/generate-merchant-split-events'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => Merchamt Split Event', () => {
  describe('when providing a transaction with a single merchant', async () => {
    const trxAmount = 2000
    const transaction = generateTransaction('hash', 'visa', 'paid', trxAmount)
    const payables = [
      generatePayable({
        transaction_id: transaction._id,
        amount: 1000,
        fee: 5,
        company_id: 'merchant_a'
      }),
      generatePayable({
        transaction_id: transaction._id,
        amount: 1000,
        fee: 5,
        company_id: 'merchant_a'
      }),
      generatePayable({
        transaction_id: transaction._id,
        amount: 10,
        company_id: 'iso_a'
      })
    ]

    const result = await generateMerchantSplitEvents(transaction, payables)

    it('should return multiple Accounting Events', () => {
      result.forEach(item => expect(item).to.be.an.instanceOf(AccountingEvent))
    })

    it('should not have a merchant split event pointing to the ISO', () => {
      return expect(result.some(ev => ev.merchant_id === 'iso_a')).to.eq(false)
    })

    it('should have a single event ponting to the merchant', () => {
      expect(result.length).to.be.eq(1)
      expect(result[0].merchant_id).to.be.eq('merchant_a')
    })
  })

  describe('when providing a transaction with a 70/30 split', async () => {
    const trxAmount = 100000
    const transaction = generateTransaction('hash', 'visa', 'paid', trxAmount)

    const merchantAPayable = generatePayable({
      transaction_id: transaction._id,
      amount: 70000,
      fee: 70,
      company_id: 'merchant_a'
    })

    const merchantBPayable = generatePayable({
      transaction_id: transaction._id,
      amount: 30000,
      fee: 30,
      company_id: 'merchant_b'
    })

    const isoPayable = generatePayable({
      transaction_id: transaction._id,
      amount: 100,
      company_id: 'iso_a'
    })

    const payables = [merchantAPayable, merchantBPayable, isoPayable]

    const result = await generateMerchantSplitEvents(transaction, payables)

    it('should return multiple Accounting Events', () => {
      result.forEach(item => expect(item).to.be.an.instanceOf(AccountingEvent))
    })

    it('should not have a merchant split event pointing to the ISO', () => {
      return expect(result.some(ev => ev.merchant_id === 'iso_a')).to.eq(false)
    })

    it('should have an event ponting to the merchant A', () => {
      expect(result.some(ev => ev.merchant_id === 'merchant_a')).to.eq(true)
    })

    it('should have an event ponting to the merchant B', () => {
      expect(result.some(ev => ev.merchant_id === 'merchant_b')).to.eq(true)
    })

    it('should have an event with the right amounts for merchant A', () => {
      const event = result.find(ev => ev.merchant_id === 'merchant_a')

      expect(event.amount_cents).to.eq(
        merchantAPayable.amount - merchantAPayable.fee
      )
    })

    it('should have an event with the right amounts for merchant B', () => {
      const event = result.find(ev => ev.merchant_id === 'merchant_b')

      expect(event.amount_cents).to.eq(
        merchantBPayable.amount - merchantBPayable.fee
      )
    })
  })
})
