import faker from 'faker'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import Affiliation from 'application/core/models/affiliation'
import { generateAffiliation } from 'test/fixtures/index'
import {
  BOLETO,
  CREDIT_CARD,
  DEBIT_CARD,
  ECOMMERCE,
  EMV
} from 'application/core/domain/methods'
import { PERCENTAGE } from 'application/core/domain/pricing'
import {
  PROPORTIONAL_TO_SPLIT,
  ASSIGNED_TO_ORIGIN_COMPANY
} from 'modules/financial-calendar/domain/chargeback-handling'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Unit => Models: Affiliation', () => {
  describe('#validate fields', () => {
    it('should validate allowed_capture_methods and allowed_payment_methods fields', done => {
      const affiliation = generateAffiliation({})
      affiliation._id = undefined
      affiliation.iso_id = faker.finance.account(14)

      const affiliationModel = new Affiliation(affiliation)

      affiliationModel.validate(err => expect(err).not.to.exist)

      expect(affiliationModel.allowed_capture_methods).to.have.members([
        EMV,
        ECOMMERCE
      ])
      expect(affiliationModel.allowed_payment_methods).to.have.members([
        CREDIT_CARD,
        DEBIT_CARD,
        BOLETO
      ])
      done()
    })

    it('should validate costs', done => {
      const expectedCosts = {
        visa: {
          debit: 4,
          credit_1: 4,
          credit_2: 4,
          credit_7: 4
        }
      }
      const affiliation = generateAffiliation({
        with_costs: true,
        brand_costs: expectedCosts
      })
      affiliation._id = undefined
      const affiliationModel = new Affiliation(affiliation)

      affiliationModel.validate(err => expect(err).not.to.exist)

      const { cost: visaCost } = affiliationModel.costs.brands.find(
        ({ brand }) => brand === 'visa'
      )

      expect(visaCost).to.include(expectedCosts.visa)
      done()
    })

    it('should validate boleto pricing', done => {
      const boletoPricing = {
        amount: 1.5,
        amount_type: PERCENTAGE
      }

      const affiliation = generateAffiliation({
        with_costs: true,
        boleto_pricing: boletoPricing
      })

      affiliation._id = undefined
      const affiliationModel = new Affiliation(affiliation)

      affiliationModel.validate(err => expect(err).not.to.exist)

      expect(affiliationModel.costs.boleto_pricing).to.include(boletoPricing)

      done()
    })

    it('should validate chargeback_handling_policy', done => {
      const affiliation = generateAffiliation({})
      affiliation._id = undefined
      ;[PROPORTIONAL_TO_SPLIT, ASSIGNED_TO_ORIGIN_COMPANY].map(
        chargebackPolicy => {
          affiliation.chargeback_handling_policy = chargebackPolicy

          const affiliationModel = new Affiliation(affiliation)

          affiliationModel.validate(err => expect(err).not.to.exist)

          expect(affiliationModel.chargeback_handling_policy).to.include(
            chargebackPolicy
          )
        }
      )

      done()
    })
  })
})
