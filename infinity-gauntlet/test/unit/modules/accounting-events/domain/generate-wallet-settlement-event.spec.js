import chai from 'chai'

import AccountingEvent from 'application/core/models/accounting-event'
import { generateWalletSettlementEvent } from 'modules/accounting-events/domain/generate-wallet-settlement-event'

import generateFakeSettlement from 'test/fixtures/generateSettlement'
import generateCompany from 'test/fixtures/generateCompany'

// chai.use(chaiAsPromised)
const { expect } = chai

describe('Accounting Events => Wallet Settlement Event', () => {
  describe('when providing a positive settlement', () => {
    const company = generateCompany()
    const settlement = generateFakeSettlement({
      company_id: company._id
    })

    const result = generateWalletSettlementEvent(settlement, company)

    it('should be an AccountingEvent', () => {
      expect(result).to.be.instanceOf(AccountingEvent)
    })

    it('should return a LIQUIDACAO_WALLET event', () => {
      expect(result.event_name).to.eq('LIQUIDACAO_WALLET')
    })

    it('should return an event with the same amount as the settlement', () => {
      expect(result.amount_cents).to.eq(settlement.amount)
    })

    it('should return an amount that is positive', () => {
      expect(result.amount_cents).to.be.greaterThan(0)
    })

    it('should return an event pointing at the correct company', () => {
      expect(result.merchant_id).to.eq(company._id)
    })

    it('should return an event pointing to the right ISO', () => {
      expect(result.iso_id).to.eq(company.parent_id)
    })
  })

  describe('when providing a negative settlement', () => {
    const company = generateCompany()
    const settlement = generateFakeSettlement({
      company_id: company._id,
      amount: -33333
    })

    const result = generateWalletSettlementEvent(settlement, company)

    it('should be an AccountingEvent', () => {
      expect(result).to.be.instanceOf(AccountingEvent)
    })

    it('should return a LIQUIDACAO_WALLET event', () => {
      expect(result.event_name).to.eq('REVERSAO_LIQUIDACAO_WALLET')
    })

    it('should return an event with the same amount as the settlement but positive', () => {
      expect(result.amount_cents).to.eq(settlement.amount * -1)
    })

    it('should return an amount that is positive', () => {
      expect(result.amount_cents).to.be.gt(0)
    })

    it('should return an event pointing at the correct company', () => {
      expect(result.merchant_id).to.eq(company._id)
    })

    it('should return an event pointing to the right ISO', () => {
      expect(result.iso_id).to.eq(company.parent_id)
    })
  })

  describe('when providing an ISO settlement', () => {
    const company = generateCompany('iso_a', [], true)

    const settlement = generateFakeSettlement({
      company_id: company._id,
      amount: 12312312
    })

    const result = generateWalletSettlementEvent(settlement, company)

    it('should be an AccountingEvent', () => {
      expect(result).to.be.instanceOf(AccountingEvent)
    })

    it('should return a LIQUIDACAO_WALLET event', () => {
      expect(result.event_name).to.eq('LIQUIDACAO_WALLET')
    })

    it('should return an event with the same amount as the settlement', () => {
      expect(result.amount_cents).to.eq(settlement.amount)
    })

    it('should return an amount that is positive', () => {
      expect(result.amount_cents).to.be.gt(0)
    })

    it('should return an event pointing at the correct company', () => {
      expect(result.merchant_id).to.eq(company._id)
    })

    it('should return an event pointing the ISO to the company itself', () => {
      expect(result.iso_id).to.eq(company._id)
    })
  })
})
