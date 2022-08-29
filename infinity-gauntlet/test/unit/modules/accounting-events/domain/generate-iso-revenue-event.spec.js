import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import AccountingEvent from 'application/core/models/accounting-event'
import { generateIsoRevenueEvent } from 'modules/accounting-events/domain/generate-iso-revenue-event'
import generateTransaction from 'test/fixtures/generateTransaction'
import generatePayable from 'test/fixtures/generatePayable'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => ISO Revenue Event', () => {
  describe("when providing a transaction with status 'paid'", async () => {
    const trxAmount = 13333
    const transaction = generateTransaction('hash', 'visa', 'paid', trxAmount)
    const payables = [
      generatePayable({ transaction_id: transaction._id, mdr_fee: 150 }),
      generatePayable({ transaction_id: transaction._id, mdr_fee: 150 })
    ]

    const result = await generateIsoRevenueEvent(transaction, payables)

    it('should return an AccountingEvent', () => {
      expect(result).to.be.instanceOf(AccountingEvent)
    })

    it('should be an event with the same amount as the transaction itself', () => {
      expect(result.amount_cents).to.be.equal(
        payables[0].mdr_fee + payables[1].mdr_fee
      )
    })

    it('should have originating_model fields pointing to the transaction', () => {
      expect(result.originating_model).to.be.equal('transaction')
      expect(result.originating_model_id).to.be.equal(`${transaction._id}`)
    })

    it("should point to the transaction's merchant", () => {
      expect(result.merchant_id).to.be.equal(transaction.company_id)
    })

    it("should point to the transaction's ISO", () => {
      expect(result.iso_id).to.be.equal(transaction.iso_id)
    })
  })
})
