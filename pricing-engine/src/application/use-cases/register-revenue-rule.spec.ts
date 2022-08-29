import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { RevenueRuleParams } from 'domain/model/revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { RuleIntegrityError } from 'errors/rule-integrity-error'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import * as sinon from 'sinon'
import { RegisterRevenueRule } from './register-revenue-rule'

describe('#registerRevenueRule', () => {
  afterEach(() => {
    sinon.restore()
  })

  const dbResultByMerchantCreated = [
    {
      id: '5d77f127-2be6-4566-973e-1128eeb2d010',
      iso_id: null,
      merchant_id: 'MCT12345',
      pricing_group_id: null,
      percentage: 2,
      flat: null,
      matching_rule: { merchantId: { $eq: '3' } },
      created_at: new Date(),
      deleted_at: null,
    },
    {
      id: 'b53d99be-cf94-483b-84ae-2d8a89036dde',
      iso_id: null,
      merchant_id: 'MCT12345',
      pricing_group_id: null,
      percentage: null,
      flat: 3,
      matching_rule: { merchantId: { $eq: '20' } },
      created_at: new Date(),
      deleted_at: null,
    },
  ].map((row) => HashRevenueRulesRepository.fromDB(row))

  const dbResultByIsoCreated = [
    {
      id: '4a460135-12ce-4eba-98b6-dda16615912f',
      iso_id: 'ISO12345',
      merchant_id: null,
      pricing_group_id: null,
      percentage: 2,
      flat: null,
      matching_rule: { merchantId: { $eq: '1' } },
      created_at: new Date(),
      deleted_at: null,
    },
    {
      id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
      iso_id: 'ISO12345',
      merchant_id: null,
      pricing_group_id: null,
      percentage: null,
      flat: 3,
      matching_rule: { merchantId: { $eq: '20' } },
      created_at: new Date(),
      deleted_at: null,
    },
  ].map((row) => HashRevenueRulesRepository.fromDB(row))

  describe('inserting a list with two rules by isoId', () => {
    let hashRevenueRulesCreated
    let stubSinon
    let args

    beforeAll(async () => {
      stubSinon = sinon
        .stub(HashRevenueRulesRepository, 'insertMany')
        .resolves(dbResultByIsoCreated)

      const targetId: TargetRuleIdentifier = { isoId: 'ISO12345' }

      const rules = [
        {
          percentage: 2,
          matchingRule: { merchantId: { $eq: '1' } },
        },
        {
          flat: 3,
          matchingRule: { merchantId: { $eq: '20' } },
        },
      ]

      const registerRevenueRule = new RegisterRevenueRule()
      hashRevenueRulesCreated = await registerRevenueRule.execute(
        targetId,
        rules
      )

      const isoId = 'ISO12345'
      args = rules.map((r) => {
        const rule = new HashRevenueRule({
          ...r,
          isoId,
        })
        return rule
      })
    })

    test('return after insert must be equal', () => {
      expect(stubSinon.calledWith(args)).toEqual(true)
      expect(hashRevenueRulesCreated[0].id).toEqual(
        '4a460135-12ce-4eba-98b6-dda16615912f'
      )
      expect(hashRevenueRulesCreated[0].isoId).toEqual('ISO12345')
      expect(hashRevenueRulesCreated[0].merchantId).toEqual(null)
      expect(hashRevenueRulesCreated[0].pricingGroupId).toEqual(null)
      expect(hashRevenueRulesCreated[0].percentage).toEqual(2)
      expect(hashRevenueRulesCreated[0].flat).toEqual(null)
      expect(hashRevenueRulesCreated[0].matchingRule).toEqual({
        merchantId: { $eq: '1' },
      })
      expect(hashRevenueRulesCreated[0].createdAt).not.toEqual(null)
      expect(hashRevenueRulesCreated[0].deletedAt).toEqual(null)
    })

    test('return after insert must be equal in the second item', () => {
      expect(stubSinon.calledWith(args)).toEqual(true)

      expect(hashRevenueRulesCreated[1].id).toEqual(
        'c8eb7cf9-e22a-4275-874b-2eb5d9d38521'
      )
      expect(hashRevenueRulesCreated[1].isoId).toEqual('ISO12345')
      expect(hashRevenueRulesCreated[1].merchantId).toEqual(null)
      expect(hashRevenueRulesCreated[1].pricingGroupId).toEqual(null)
      expect(hashRevenueRulesCreated[1].percentage).toEqual(null)
      expect(hashRevenueRulesCreated[1].flat).toEqual(3)
      expect(hashRevenueRulesCreated[1].matchingRule).toEqual({
        merchantId: { $eq: '20' },
      })
      expect(hashRevenueRulesCreated[1].createdAt).not.toEqual(null)
      expect(hashRevenueRulesCreated[1].deletedAt).toEqual(null)
    })
  })

  describe('inserting a list with two rules by merchantId', () => {
    let hashRevenueRulesCreated
    let stubSinon
    let args

    beforeAll(async () => {
      stubSinon = sinon
        .stub(HashRevenueRulesRepository, 'insertMany')
        .resolves(dbResultByMerchantCreated)

      const registerRevenueRule = new RegisterRevenueRule()

      const targetId: TargetRuleIdentifier = { merchantId: 'MCT12345' }

      const rules = [
        {
          percentage: 2,
          matchingRule: { merchantId: { $eq: '3' } },
        },
        {
          flat: 3,
          matchingRule: { merchantId: { $eq: '20' } },
        },
      ]

      hashRevenueRulesCreated = await registerRevenueRule.execute(
        targetId,
        rules
      )

      const merchantId = 'MCT12345'
      args = rules.map((r) => {
        const rule = new HashRevenueRule({
          ...r,
          merchantId,
        })
        return rule
      })
    })

    test('return after insert must be equal', () => {
      expect(stubSinon.calledWith(args)).toEqual(true)

      expect(hashRevenueRulesCreated[0].id).toEqual(
        '5d77f127-2be6-4566-973e-1128eeb2d010'
      )
      expect(hashRevenueRulesCreated[0].isoId).toEqual(null)
      expect(hashRevenueRulesCreated[0].merchantId).toEqual('MCT12345')
      expect(hashRevenueRulesCreated[0].pricingGroupId).toEqual(null)
      expect(hashRevenueRulesCreated[0].percentage).toEqual(2)
      expect(hashRevenueRulesCreated[0].flat).toEqual(null)
      expect(hashRevenueRulesCreated[0].matchingRule).toEqual({
        merchantId: { $eq: '3' },
      })
      expect(hashRevenueRulesCreated[0].createdAt).not.toEqual(null)
      expect(hashRevenueRulesCreated[0].deletedAt).toEqual(null)
    })

    test('return after insert must be equal in the second item', () => {
      expect(stubSinon.calledWith(args)).toEqual(true)

      expect(hashRevenueRulesCreated[1].id).toEqual(
        'b53d99be-cf94-483b-84ae-2d8a89036dde'
      )
      expect(hashRevenueRulesCreated[1].isoId).toEqual(null)
      expect(hashRevenueRulesCreated[1].merchantId).toEqual('MCT12345')
      expect(hashRevenueRulesCreated[1].pricingGroupId).toEqual(null)
      expect(hashRevenueRulesCreated[1].percentage).toEqual(null)
      expect(hashRevenueRulesCreated[1].flat).toEqual(3)
      expect(hashRevenueRulesCreated[1].matchingRule).toEqual({
        merchantId: { $eq: '20' },
      })
      expect(hashRevenueRulesCreated[1].createdAt).not.toEqual(null)
      expect(hashRevenueRulesCreated[1].deletedAt).toEqual(null)
    })
  })

  describe('Validating domain throwif', () => {
    test('error when rule without flat and percentage', async () => {
      const rules: RevenueRuleParams[] = [
        {
          matchingRule: { accountType: { $eq: 'credit' } },
        },
      ]

      sinon.stub(HashRevenueRulesRepository, 'insertMany').resolves([])

      const registerRevenueRule = new RegisterRevenueRule()
      const targetId: TargetRuleIdentifier = { merchantId: 'MCT12345' }

      const promise = registerRevenueRule.execute(targetId, rules)
      await expect(promise).rejects.toThrowError(RuleIntegrityError)
    })

    test.each([
      [{ accountType: 'credit' }, '"credit" is not a valid query.'],
      [{ accountType: { $xor: 'credit' } }, '$xor not supported.'],
      [
        { accountType: ['credit', 'debit'] },
        '"credit,debit" is not a valid query.',
      ],
    ])('invalid matching rule %p', async (matchingRule, errorMessage) => {
      const rules: RevenueRuleParams[] = [
        {
          percentage: 10000,
          matchingRule,
        },
      ]

      sinon.stub(HashRevenueRulesRepository, 'insertMany').resolves([])

      const registerRevenueRule = new RegisterRevenueRule()

      const promise = registerRevenueRule.execute({ isoId: 'iso' }, rules)
      await expect(promise).rejects.toThrowError(RuleIntegrityError)
      await expect(promise).rejects.toThrowError(errorMessage)
    })
  })

  describe('returning error when we have a problem with database ', () => {
    const createdError = new Error('Error to insert data in hash_revenue_rules')
    beforeAll(() => {
      sinon.stub(HashRevenueRulesRepository, 'insertMany').throws(createdError)
    })

    test('testing hash-revenue-rule-repository insert in hash_revenue_rules', async () => {
      const registerRevenueRule = new RegisterRevenueRule()
      const targetId: TargetRuleIdentifier = { merchantId: 'MCT12345' }
      const rules = []

      const promise = registerRevenueRule.execute(targetId, rules)
      await expect(promise).rejects.toThrowError(
        'Error to insert data in hash_revenue_rules'
      )
    })
  })
})
