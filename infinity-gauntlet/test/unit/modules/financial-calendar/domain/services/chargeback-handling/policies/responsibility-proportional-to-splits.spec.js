import { expect } from 'chai'
import * as ChargebackResponsibilityProportionalToSplit from 'modules/financial-calendar/domain/chargeback-handling/policies/responsibility-proportional-to-splits'
import { generatePayable } from 'test/fixtures'

describe('Unit => Financial Calendar - Domain - Chargeback Handling - Responsbility Proportional To Splits', () => {
  context('#apply', () => {
    let dataTable, payables, chargebackPayables

    before(() => {
      dataTable = [
        {
          amount: 10000,
          anticipation_fee: 0,
          company_id: 'companyA',
          cost: 0,
          fee: 3200,
          mdr_cost: 0,
          mdr_fee: 200
        },
        {
          amount: 3000,
          anticipation_fee: 0,
          company_id: 'companyB',
          cost: 70,
          fee: 0,
          mdr_cost: 70,
          mdr_fee: 0
        },
        {
          amount: 200,
          anticipation_fee: 0,
          company_id: 'ISO',
          cost: 120,
          fee: 0,
          mdr_cost: 120,
          mdr_fee: 0
        }
      ]

      payables = dataTable.map(data => generatePayable(data))

      chargebackPayables = ChargebackResponsibilityProportionalToSplit.apply({
        payables
      })
    })

    it('should generate chargeback_debit payables', () => {
      expect(
        chargebackPayables.every(payable => payable.type === 'chargeback_debit')
      ).to.be.true
    })

    it('should generate payables with negative amounts', () => {
      expect(chargebackPayables.every(payable => payable.amount <= 0)).to.be
        .true
    })

    it('should generate one chargeback payable for every original payable', () => {
      expect(chargebackPayables.length).to.eql(payables.length)
    })

    it("should generate chargeback payables matching an original payable's amount and company", () => {
      chargebackPayables.forEach(chargebackPayable => {
        payables.some(
          payable =>
            payable.amount === chargebackPayable.amount * -1 &&
            payable.company_id === chargebackPayable.company_id
        )
      })
    })
  })
})
