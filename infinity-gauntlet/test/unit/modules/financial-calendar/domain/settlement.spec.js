import { expect } from 'chai'
import SettlementDomain from 'modules/financial-calendar/domain/settlement'

describe('Unit => Financial Calendar - Domain => Settlement', () => {
  context('calculateSettlementValues', () => {
    context('consolidate settlement with card and boleto payables', () => {
      const baseSettlement = {
        settlement_type: 'wallet',
        provider: 'hash',
        status: 'processing',
        date: '2020-07-13',
        amount: 0,
        settled_amount: 0,
        last_negative_amount: 0,
        brands: [],
        charges: [],
        boleto: {
          payables: [],
          amount: 0
        },
        received_charges: [],
        affiliations: ['affiliation_id'],
        company_id: 'company_id'
      }
      const affiliationPayables = {
        _id: 'affiliation_id',
        payables: [
          {
            amount: 26770,
            fee: 0,
            cost: 509,
            _id: 8252950,
            company_id: 'company_id',
            card_brand: 'mastercard',
            payment_method: 'credit_card',
            total_installments: 1
          },
          {
            amount: 5800,
            fee: 0,
            cost: 25,
            _id: 8252950,
            company_id: 'company_id',
            card_brand: 'visa',
            payment_method: 'credit_card',
            total_installments: 1
          },
          {
            amount: 3590,
            fee: 400,
            cost: 0,
            _id: 8795697,
            company_id: 'company_id',
            payment_method: 'boleto',
            total_installments: 1
          }
        ]
      }

      const settlement = SettlementDomain.calculateSettlement(
        baseSettlement,
        affiliationPayables
      )

      it('should all brands consolidate named', () => {
        const hasAnyBrandUnnamed = settlement.brands.some(({ brand }) => !brand)
        expect(hasAnyBrandUnnamed).to.be.false
      })
      it('should consolidate boleto payables', () => {
        expect(settlement.boleto.amount).to.be.eq(3190)
        expect(settlement.boleto.payables).include(8795697)
      })
      it('should consolidate card payables', () => {
        settlement.brands.map(({ brand, credit }) => {
          if (brand === 'mastercard') {
            expect(credit).to.be.eq(26261)
          }
          if (brand === 'visa') {
            expect(credit).to.be.eq(5775)
          }
        })
      })
    })
    context('when payables have amounts escrowed at CIP', () => {
      context('on a settlement without cip_escrowed_amount', () => {
        const baseSettlement = {
          settlement_type: 'wallet',
          provider: 'hash',
          status: 'processing',
          date: '2020-07-13',
          amount: 0,
          settled_amount: 0,
          last_negative_amount: 0,
          brands: [],
          charges: [],
          boleto: {
            payables: [],
            amount: 0
          },
          received_charges: [],
          affiliations: ['affiliation_id'],
          company_id: 'company_id'
        }

        const payableWithoutEscrow = {
          amount: 26770,
          fee: 509,
          cost: 0,
          _id: 8252950,
          company_id: 'companyA',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          total_installments: 1
        }

        const affiliationPayables = {
          _id: 'affiliation_id',
          payables: [payableWithoutEscrow]
        }

        const settlement = SettlementDomain.calculateSettlement(
          baseSettlement,
          affiliationPayables
        )

        it('should have an amount equal to the payable net value ', () => {
          const net =
            payableWithoutEscrow.amount -
            payableWithoutEscrow.fee -
            payableWithoutEscrow.cost
          expect(settlement.amount).to.be.eq(net)
        })
      })

      context(
        'on a single brand having one credit payable with cip_escrowed_amount',
        () => {
          const baseSettlement = {
            settlement_type: 'wallet',
            provider: 'hash',
            status: 'processing',
            date: '2020-07-13',
            amount: 0,
            settled_amount: 0,
            last_negative_amount: 0,
            brands: [],
            charges: [],
            boleto: {
              payables: [],
              amount: 0
            },
            received_charges: [],
            affiliations: ['affiliation_id'],
            company_id: 'company_id'
          }

          const payableWithEscrow = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 80,
            _id: 8252950,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const payableWithoutEscrow = {
            amount: 26770,
            fee: 509,
            cost: 0,
            _id: 8252950,
            company_id: 'companyA',
            card_brand: 'mastercard',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const affiliationPayables = {
            _id: 'affiliation_id',
            payables: [payableWithoutEscrow, payableWithEscrow]
          }

          const settlement = SettlementDomain.calculateSettlement(
            baseSettlement,
            affiliationPayables
          )

          it('should not have an amount equal to the sum amounts minus fees and costs ', () => {
            const wrongNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total + (payable.amount - payable.cost - payable.fee),
              0
            )

            expect(settlement.amount).to.not.be.eql(wrongNet)
          })

          it('should have an amount equal to the sum amounts minus fees and costs minus cip_escrowed_amount', () => {
            const expectedNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total +
                (payable.amount -
                  payable.cost -
                  payable.fee -
                  (payable.cip_escrowed_amount || 0)),
              0
            )

            expect(settlement.amount).to.be.eql(expectedNet)
          })
        }
      )

      context(
        'on a single brand having multiple credit payables with cip_escrowed_amount',
        () => {
          const baseSettlement = {
            settlement_type: 'wallet',
            provider: 'hash',
            status: 'processing',
            date: '2020-07-13',
            amount: 0,
            settled_amount: 0,
            last_negative_amount: 0,
            brands: [],
            charges: [],
            boleto: {
              payables: [],
              amount: 0
            },
            received_charges: [],
            affiliations: ['affiliation_id'],
            company_id: 'company_id'
          }

          const payable1 = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 80,
            _id: 8252950,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const payable2 = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 100,
            _id: 8252951,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const payable3 = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 82,
            _id: 8252952,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const payableWithoutEscrow = {
            amount: 26770,
            fee: 509,
            cost: 0,
            _id: 8252953,
            company_id: 'companyA',
            card_brand: 'mastercard',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const affiliationPayables = {
            _id: 'affiliation_id',
            payables: [payableWithoutEscrow, payable1, payable2, payable3]
          }

          const settlement = SettlementDomain.calculateSettlement(
            baseSettlement,
            affiliationPayables
          )

          it('should not have an amount equal to the sum amounts minus fees and costs ', () => {
            const wrongNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total + (payable.amount - payable.cost - payable.fee),
              0
            )

            expect(settlement.amount).to.not.be.eql(wrongNet)
          })

          it('should have an amount equal to the sum amounts minus fees and costs minus cip_escrowed_amount', () => {
            const expectedNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total +
                (payable.amount -
                  payable.cost -
                  payable.fee -
                  (payable.cip_escrowed_amount || 0)),
              0
            )

            expect(settlement.amount).to.be.eql(expectedNet)
          })

          it('should have a brand.cip_escrowed_credit value equal to the sum of the escrowed payables escrowed values', () => {
            const totalEscrowedVisaCredit = [
              payable1,
              payable2,
              payable3
            ].reduce((total, p) => total + p.cip_escrowed_amount, 0)

            const visaBrand = settlement.brands.find(
              ({ brand }) => brand === 'visa'
            )

            expect(visaBrand.cip_escrowed_credit).to.be.eql(
              totalEscrowedVisaCredit
            )
          })
        }
      )

      context(
        'on a single brand having multiple debit payables with cip_escrowed_amount',
        () => {
          const baseSettlement = {
            settlement_type: 'wallet',
            provider: 'hash',
            status: 'processing',
            date: '2020-07-13',
            amount: 0,
            settled_amount: 0,
            last_negative_amount: 0,
            brands: [],
            charges: [],
            boleto: {
              payables: [],
              amount: 0
            },
            received_charges: [],
            affiliations: ['affiliation_id'],
            company_id: 'company_id'
          }

          const payable1 = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 80,
            _id: 8252950,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'debit_card',
            total_installments: 1
          }

          const payable2 = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 100,
            _id: 8252951,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'debit_card',
            total_installments: 1
          }

          const payable3 = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 82,
            _id: 8252952,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'debit_card',
            total_installments: 1
          }

          const payableWithoutEscrow = {
            amount: 26770,
            fee: 509,
            cost: 0,
            _id: 8252953,
            company_id: 'companyA',
            card_brand: 'mastercard',
            payment_method: 'debit_card',
            total_installments: 1
          }

          const affiliationPayables = {
            _id: 'affiliation_id',
            payables: [payableWithoutEscrow, payable1, payable2, payable3]
          }

          const settlement = SettlementDomain.calculateSettlement(
            baseSettlement,
            affiliationPayables
          )

          it('should not have an amount equal to the sum amounts minus fees and costs ', () => {
            const wrongNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total + (payable.amount - payable.cost - payable.fee),
              0
            )

            expect(settlement.amount).to.not.be.eql(wrongNet)
          })

          it('should have an amount equal to the sum amounts minus fees and costs minus cip_escrowed_amount', () => {
            const expectedNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total +
                (payable.amount -
                  payable.cost -
                  payable.fee -
                  (payable.cip_escrowed_amount || 0)),
              0
            )

            expect(settlement.amount).to.be.eql(expectedNet)
          })

          it('should have a brand.cip_escrowed_debit value equal to the sum of the escrowed payables escrowed values', () => {
            const totalEscrowedVisaDebit = [
              payable1,
              payable2,
              payable3
            ].reduce((total, p) => total + p.cip_escrowed_amount, 0)

            const visaBrand = settlement.brands.find(
              ({ brand }) => brand === 'visa'
            )

            expect(visaBrand.cip_escrowed_debit).to.be.eql(
              totalEscrowedVisaDebit
            )
          })
        }
      )

      context(
        'on multiple brands having payables for credit with cip_escrowed_amount',
        () => {
          const baseSettlement = {
            settlement_type: 'wallet',
            provider: 'hash',
            status: 'processing',
            date: '2020-07-13',
            amount: 0,
            settled_amount: 0,
            last_negative_amount: 0,
            brands: [],
            charges: [],
            boleto: {
              payables: [],
              amount: 0
            },
            received_charges: [],
            affiliations: ['affiliation_id'],
            company_id: 'company_id'
          }

          const visaPayableWithEscrow = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 80,
            _id: 8252950,
            company_id: 'companyA',
            card_brand: 'visa',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const masterPayableWithEscrow = {
            amount: 5800,
            fee: 25,
            cost: 0,
            cip_escrowed_amount: 100,
            _id: 8252954,
            company_id: 'companyA',
            card_brand: 'mastercard',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const payableWithoutEscrow = {
            amount: 26770,
            fee: 509,
            cost: 0,
            _id: 8252953,
            company_id: 'companyA',
            card_brand: 'amex',
            payment_method: 'credit_card',
            total_installments: 1
          }

          const affiliationPayables = {
            _id: 'affiliation_id',
            payables: [
              payableWithoutEscrow,
              visaPayableWithEscrow,
              masterPayableWithEscrow
            ]
          }

          const settlement = SettlementDomain.calculateSettlement(
            baseSettlement,
            affiliationPayables
          )

          it('should not have an amount equal to the sum amounts minus fees and costs ', () => {
            const wrongNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total + (payable.amount - payable.cost - payable.fee),
              0
            )

            expect(settlement.amount).to.not.be.eql(wrongNet)
          })

          it('should have an amount equal to the sum amounts minus fees and costs minus cip_escrowed_amount', () => {
            const expectedNet = affiliationPayables.payables.reduce(
              (total, payable) =>
                total +
                (payable.amount -
                  payable.cost -
                  payable.fee -
                  (payable.cip_escrowed_amount || 0)),
              0
            )

            expect(settlement.amount).to.be.eql(expectedNet)
          })

          it('should have visa and master brands', () => {
            const visaBrand = settlement.brands.find(
              ({ brand }) => brand === 'visa'
            )
            const mastercardBrand = settlement.brands.find(
              ({ brand }) => brand === 'mastercard'
            )
            expect(visaBrand).not.to.be.null
            expect(mastercardBrand).not.to.be.null
          })

          it('should have a visa brand with cip_escrowed_credit equal to the payable', () => {
            const visaBrand = settlement.brands.find(
              ({ brand }) => brand === 'visa'
            )

            expect(visaBrand.cip_escrowed_credit).to.be.eql(
              visaPayableWithEscrow.cip_escrowed_amount
            )
          })

          it('should have a mastercard brand with cip_escrowed_credit equal to the payable', () => {
            const masterBrand = settlement.brands.find(
              ({ brand }) => brand === 'mastercard'
            )

            expect(masterBrand.cip_escrowed_credit).to.be.eql(
              masterPayableWithEscrow.cip_escrowed_amount
            )
          })

          it('should have other brands with no escrow with a cip_escrowed_credit === 0', () => {
            const amexBrand = settlement.brands.find(
              ({ brand }) => brand === 'amex'
            )

            expect(amexBrand.cip_escrowed_credit).to.be.eql(0)
          })
        }
      )
    })
  })
})
