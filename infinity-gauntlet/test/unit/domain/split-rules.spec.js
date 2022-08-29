import { expect } from 'chai'
import { hasCurrentCompanyIdInSplitRules } from 'application/core/domain/split-rules'

describe('Unit => Domain: Split Rules', () => {
  context('hasCurrentCompanyIdInSplutRules', () => {
    it('split rules with diferrent company ids', () => {
      const default_split_rules = [
        {
          percentage: 30,
          company_id: 'company_A',
          charge_processing_cost: false
        },
        {
          percentage: 5,
          company_id: 'company_B',
          charge_processing_cost: false
        }
      ]

      expect(hasCurrentCompanyIdInSplitRules(default_split_rules, 'company_C'))
        .to.be.false
    })

    it('current updatable company in split rules', () => {
      const default_split_rules = [
        {
          percentage: 30,
          company_id: 'company_A',
          charge_processing_cost: false
        },
        {
          percentage: 5,
          company_id: 'company_B',
          charge_processing_cost: false
        }
      ]

      expect(hasCurrentCompanyIdInSplitRules(default_split_rules, 'company_B'))
        .to.be.true
    })
  })
})
