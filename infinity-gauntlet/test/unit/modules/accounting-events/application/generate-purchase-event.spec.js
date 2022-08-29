import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import AccountingEvent from 'application/core/models/accounting-event'
import { generatePurchaseEvent } from 'modules/accounting-events/application/generate-purchase-event'
import generateTransaction from 'test/fixtures/generateTransaction'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => Purchase Event', () => {
  describe("when providing a transaction with status 'paid'", async () => {
    const trxAmount = 13333
    const transaction = generateTransaction('hash', 'visa', 'paid', trxAmount)

    const result = await generatePurchaseEvent(transaction)

    it('should return an AccountingEvent', () => {
      expect(result).to.be.instanceOf(AccountingEvent)
    })

    it('should be an event with the same amount as the transaction itself', () => {
      expect(result.amount_cents).to.be.equal(trxAmount)
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

  describe("when providing a transaction with status different from 'paid'", () => {
    const transaction = generateTransaction('hash', 'visa', 'refused', 10000)

    it('should error', () => {
      return expect(generatePurchaseEvent(transaction)).to.eventually.be
        .rejected
    })
  })
})
