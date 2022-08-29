import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import FeeRule from 'application/core/models/fee-rule'
import { feeRule as MockFeeRule } from 'test/mocks/fee-rule'
import { FLAT } from 'application/core/domain/pricing'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Unit => Models: FeeRule', () => {
  describe('#validate fields', () => {
    it('should validate fees', done => {
      const mockedFeeRule = MockFeeRule()

      const feeRuleModel = new FeeRule(mockedFeeRule)

      feeRuleModel.validate(err => expect(err).not.to.exist)

      const { fee: visaFee } = feeRuleModel.brands.find(
        ({ brand }) => brand === 'visa'
      )

      expect(visaFee).to.include({
        debit: 1,
        credit_1: 2,
        credit_2: 4,
        credit_7: 6
      })

      expect(feeRuleModel.boleto_pricing.amount).to.be.equal(3)
      expect(feeRuleModel.boleto_pricing.amount_type).to.be.equal(FLAT)

      done()
    })
  })
})
