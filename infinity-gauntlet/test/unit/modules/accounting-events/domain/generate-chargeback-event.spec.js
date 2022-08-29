import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import AccountingEvent from 'application/core/models/accounting-event'
import { generateChargebackEvent } from 'modules/accounting-events/domain/generate-chargeback-event'
import generateTransaction from 'test/fixtures/generateTransaction'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => Chargeback Event', () => {
  describe("when providing a transaction with status 'chargedback'", async () => {
    const trxAmount = 13333
    const transaction = generateTransaction(
      'hash',
      'visa',
      'chargedback',
      trxAmount
    )

    const result = await generateChargebackEvent(transaction)

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

  describe("when providing a transaction with status different from 'chargedback'", () => {
    const transaction = generateTransaction('hash', 'visa', 'refused', 10000)

    it('should error', () => {
      return expect(generateChargebackEvent(transaction)).to.eventually.be
        .rejected
    })
  })
})
