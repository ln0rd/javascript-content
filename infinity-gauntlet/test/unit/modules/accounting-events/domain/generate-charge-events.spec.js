import { expect } from 'chai'
import generateCompany from 'test/fixtures/generateCompany'
import generateSettlement from 'test/fixtures/generateSettlement'
import { generateChargeEvents } from 'modules/accounting-events/domain/generate-charge-events'

describe('Accounting Events => Charge Split Event', () => {
  describe('when providing a settlement with both outgoing and received charges', () => {
    const company = generateCompany()
    const settlement = generateSettlement({ company_id: company._id })

    const result = generateChargeEvents(settlement, company)

    it('should have the right amount of CREDITO_CHARGE events', () => {
      const creditoCharges = result.filter(
        ev => ev.event_name === 'CREDITO_CHARGE'
      )

      expect(creditoCharges.length).to.eq(settlement.received_charges.length)
    })

    it('should have the right amount of DEBITO_CHARGES events', () => {
      const debitoCharges = result.filter(
        ev => ev.event_name === 'DEBITO_CHARGE'
      )

      expect(debitoCharges.length).to.eq(settlement.charges.length)
    })
  })

  describe('when providing a settlement with only received charges', () => {
    const company = generateCompany()
    const settlement = generateSettlement({
      company_id: company._id,
      charges: []
    })

    const result = generateChargeEvents(settlement, company)

    it('should have the right amount of CREDITO_CHARGE events', () => {
      const creditoCharges = result.filter(
        ev => ev.event_name === 'CREDITO_CHARGE'
      )

      expect(creditoCharges.length).to.eq(settlement.received_charges.length)
    })

    it('should have no DEBITO_CHARGES events', () => {
      const debitoCharges = result.filter(
        ev => ev.event_name === 'DEBITO_CHARGE'
      )

      expect(debitoCharges.length).to.eq(0)
    })
  })

  describe('when providing a settlement with only outgoing charges', () => {
    const company = generateCompany()
    const settlement = generateSettlement({
      company_id: company._id,
      received_charges: []
    })

    const result = generateChargeEvents(settlement, company)

    it('should have the right amount of DEBITO_CHARGE events', () => {
      const debitoCharges = result.filter(
        ev => ev.event_name === 'DEBITO_CHARGE'
      )

      expect(debitoCharges.length).to.eq(settlement.charges.length)
    })

    it('should have no CREDITO_CHARGE events', () => {
      const creditoCharges = result.filter(
        ev => ev.event_name === 'CREDITO_CHARGE'
      )

      expect(creditoCharges.length).to.eq(0)
    })
  })
})
