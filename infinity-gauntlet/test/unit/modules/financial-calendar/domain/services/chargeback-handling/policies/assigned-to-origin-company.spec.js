import mongoose from 'mongoose'
import { expect } from 'chai'
import * as AssignedToOriginCompany from 'modules/financial-calendar/domain/chargeback-handling/policies/assigned-to-origin-company'
import { generatePayable } from 'test/fixtures'
const { ObjectId } = mongoose.Types

describe('Unit => Financial Calendar - Domain - Chargeback Handling - Assigned To Origin Company', () => {
  context('#apply', () => {
    context('on a 70/30 split transaction', () => {
      let dataTable, companies, payables, chargebackPayables

      const [COMPANY_A, COMPANY_B, ISO] = [
        ObjectId().toString(),
        ObjectId().toString(),
        ObjectId().toString()
      ]

      before(() => {
        dataTable = [
          {
            amount: 10000,
            anticipation_fee: 0,
            company_id: COMPANY_A,
            cost: 0,
            fee: 3200,
            mdr_cost: 0,
            mdr_fee: 200,
            origin_company_id: COMPANY_A
          },
          {
            amount: 3000,
            anticipation_fee: 0,
            company_id: COMPANY_B,
            cost: 70,
            fee: 0,
            mdr_cost: 70,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          },
          {
            amount: 200,
            anticipation_fee: 0,
            company_id: ISO,
            cost: 120,
            fee: 0,
            mdr_cost: 120,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          }
        ]

        companies = [
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ]

        payables = dataTable.map(data => generatePayable(data))

        chargebackPayables = AssignedToOriginCompany.apply({
          payables,
          companies
        })
      })

      it('should generate chargeback_debit payables', () => {
        chargebackPayables.forEach(payable =>
          expect(payable.type).to.eql('chargeback_debit')
        )
      })

      it('should generate payables with negative amounts', () => {
        chargebackPayables.forEach(payable =>
          expect(payable.amount).to.be.lte(0)
        )
      })

      it('should generate one chargeback payable for every original payable', () => {
        expect(chargebackPayables.length).to.eql(payables.length)
      })

      it('should generate all payables pointing to the origin company id or to the iso', () => {
        chargebackPayables.forEach(payable =>
          expect(payable.company_id).to.be.oneOf([COMPANY_A, ISO])
        )
      })

      it('should not generate payables for other companies in the split', () => {
        chargebackPayables.forEach(payable => {
          expect(payable.company_id).not.to.eql(COMPANY_B)
        })
      })
    })

    context(
      'on a 0/100 split transaction when payables are Loja Leo and we need transfer to merchant',
      () => {
        let dataTable,
          payables,
          companies,
          result,
          newPayablesToMerchantAndIso,
          expectedMarceneiroCompanyId,
          expectedISOCompanyId

        before(() => {
          const [COMPANY_MARCENEIRO, COMPANY_LOJA, ISO] = [
            ObjectId().toString(),
            ObjectId().toString(),
            ObjectId().toString()
          ]

          dataTable = [
            {
              amount: 10000,
              anticipation_fee: 0,
              company_id: COMPANY_LOJA,
              cost: 0,
              fee: 3200,
              mdr_cost: 0,
              mdr_fee: 200,
              origin_company_id: COMPANY_MARCENEIRO,
              iso_id: ISO
            },
            {
              amount: 3000,
              anticipation_fee: 0,
              company_id: ISO,
              cost: 70,
              fee: 0,
              mdr_cost: 70,
              mdr_fee: 0,
              origin_company_id: COMPANY_MARCENEIRO,
              iso_id: ISO
            }
          ]

          companies = [{ _id: COMPANY_LOJA, parent_id: ISO }, { _id: ISO }]

          payables = dataTable.map(data => generatePayable(data))
          payables[1].iso_id = ISO

          result = AssignedToOriginCompany.apply({
            payables,
            companies
          })

          expectedISOCompanyId = ISO
          expectedMarceneiroCompanyId = COMPANY_MARCENEIRO
          newPayablesToMerchantAndIso = result.map(
            ({ company_id }) => company_id
          )
        })

        it('payables must be merchant payables', () => {
          expect(newPayablesToMerchantAndIso[0]).to.be.equal(
            expectedMarceneiroCompanyId
          )
          expect(newPayablesToMerchantAndIso[1]).to.be.equal(
            expectedISOCompanyId
          )
        })
      }
    )

    context('on a 0/100 split transaction', () => {
      let dataTable, companies, payables, chargebackPayables

      const [COMPANY_A, COMPANY_B, ISO] = [
        ObjectId().toString(),
        ObjectId().toString(),
        ObjectId().toString()
      ]

      before(() => {
        dataTable = [
          {
            amount: 3000,
            anticipation_fee: 0,
            company_id: COMPANY_B,
            cost: 70,
            fee: 0,
            mdr_cost: 70,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          }
        ]

        companies = [{ _id: COMPANY_B, parent_id: ISO }]

        payables = dataTable.map(data => generatePayable(data))

        chargebackPayables = AssignedToOriginCompany.apply({
          payables,
          companies
        })
      })

      it('should generate chargeback_debit payables', () => {
        chargebackPayables.forEach(payable =>
          expect(payable.type).to.eql('chargeback_debit')
        )
      })

      it('should generate payables with negative amounts', () => {
        chargebackPayables.forEach(payable =>
          expect(payable.amount).to.be.lte(0)
        )
      })

      it('should generate one chargeback payable for every original payable', () => {
        expect(chargebackPayables.length).to.eql(payables.length)
      })

      it('should generate all payables pointing to the origin company id', () => {
        chargebackPayables.forEach(payable =>
          expect(payable.company_id).to.eql(COMPANY_A)
        )
      })

      it('should not generate payables for other companies in the split', () => {
        chargebackPayables.forEach(payable => {
          expect(payable.company_id).not.to.eql(COMPANY_B)
          expect(payable.company_id).not.to.eql(ISO)
        })
      })
    })
  })
  context('#getFuturePayablesIdsToAdvance', () => {
    context('all company b payables needs to advance', () => {
      let dataTable, companies, payables, payablesToAdvance

      const [COMPANY_A, COMPANY_B, ISO] = [
        ObjectId().toString(),
        ObjectId().toString(),
        ObjectId().toString()
      ]

      before(() => {
        dataTable = [
          {
            _id: 1,
            amount: 10000,
            anticipation_fee: 0,
            company_id: COMPANY_A,
            cost: 0,
            fee: 3200,
            mdr_cost: 0,
            mdr_fee: 200,
            origin_company_id: COMPANY_A
          },
          {
            _id: 2,
            amount: 3000,
            anticipation_fee: 0,
            company_id: COMPANY_B,
            cost: 70,
            fee: 0,
            mdr_cost: 70,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          },
          {
            _id: 3,
            amount: 200,
            anticipation_fee: 0,
            company_id: ISO,
            cost: 120,
            fee: 0,
            mdr_cost: 120,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          }
        ]

        companies = [
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ]
        payables = dataTable.map(data => generatePayable(data))
        payablesToAdvance = AssignedToOriginCompany.getFuturePayablesIdsToAdvance(
          {
            payables,
            companies
          }
        )
      })

      it('should not return company b payables ids', () => {
        expect(payablesToAdvance.length).to.eq(2)
        expect(payablesToAdvance.some(id => id === 2)).to.eq(false)
      })
    })
    context('half of company b payables have already been paid', () => {
      let dataTable, companies, payables, payablesToAdvance

      const [COMPANY_A, COMPANY_B, ISO] = [
        ObjectId().toString(),
        ObjectId().toString(),
        ObjectId().toString()
      ]

      before(() => {
        dataTable = [
          {
            _id: 1,
            amount: 10000,
            anticipation_fee: 0,
            company_id: COMPANY_A,
            status: 'paid',
            installment: 1,
            cost: 0,
            fee: 3200,
            mdr_cost: 0,
            mdr_fee: 200,
            origin_company_id: COMPANY_A
          },
          {
            _id: 2,
            amount: 3000,
            anticipation_fee: 0,
            company_id: COMPANY_B,
            installment: 1,
            status: 'paid',
            cost: 70,
            fee: 0,
            mdr_cost: 70,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          },
          {
            _id: 3,
            amount: 200,
            anticipation_fee: 0,
            company_id: ISO,
            installment: 1,
            status: 'paid',
            cost: 120,
            fee: 0,
            mdr_cost: 120,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          },
          {
            _id: 4,
            amount: 10000,
            anticipation_fee: 0,
            company_id: COMPANY_A,
            installment: 2,
            cost: 0,
            fee: 3200,
            mdr_cost: 0,
            mdr_fee: 200,
            origin_company_id: COMPANY_A
          },
          {
            _id: 5,
            amount: 3000,
            anticipation_fee: 0,
            company_id: COMPANY_B,
            installment: 2,
            cost: 70,
            fee: 0,
            mdr_cost: 70,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          },
          {
            _id: 6,
            amount: 200,
            anticipation_fee: 0,
            company_id: ISO,
            installment: 2,
            cost: 120,
            fee: 0,
            mdr_cost: 120,
            mdr_fee: 0,
            origin_company_id: COMPANY_A
          }
        ]

        companies = [
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ]
        payables = dataTable.map(data => generatePayable(data))
        payablesToAdvance = AssignedToOriginCompany.getFuturePayablesIdsToAdvance(
          {
            payables,
            companies
          }
        )
      })

      it('should not return company b payables ids', () => {
        expect(payablesToAdvance.length).to.eq(2)
        expect(payablesToAdvance.some(id => id === 2)).to.eq(false)
      })
    })
  })
})
