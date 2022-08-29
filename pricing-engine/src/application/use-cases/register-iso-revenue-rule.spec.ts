import {
  IsoRevenueRule,
  IsoRevenueRuleParams,
} from 'domain/model/iso-revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { RuleIntegrityError } from 'errors/rule-integrity-error'
import { TargetIdentificationError } from 'errors/target-identification-error'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import * as sinon from 'sinon'
import { RegisterIsoRevenueRule } from './register-iso-revenue-rule'

describe('#registerIsoRevenueRule', () => {
  afterEach(() => {
    sinon.restore()
  })

  test('insert a single rule for an iso', async () => {
    const isoId = '7'
    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 600,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    const dbResult: IsoRevenueRule[] = [
      {
        id: '4a460135-12ce-4eba-98b6-dda16615912f',
        iso_id: '7',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 600,
        use_split_values: false,
        flat: null,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-07-13T16:56:58.322Z'),
        deleted_at: null,
      },
    ].map((row) => IsoRevenueRulesRepository.fromDB(row))

    const args = rules.map((r) => {
      const rule = new IsoRevenueRule({
        ...r,
        isoId,
      })
      return rule
    })

    const stub = sinon
      .stub(IsoRevenueRulesRepository, 'insertMany')
      .resolves(dbResult)

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()
    const result = await registerIsoRevenueRule.execute({ isoId }, rules)

    expect(stub.calledWith(args)).toEqual(true)

    expect(result.length).toEqual(1)
    expect(result[0].id).toEqual('4a460135-12ce-4eba-98b6-dda16615912f')
    expect(result[0].isoId).toEqual('7')
    expect(result[0].merchantId).toEqual(null)
    expect(result[0].pricingGroupId).toEqual(null)
    expect(result[0].percentage).toEqual(600)
    expect(result[0].useSplitValues).toEqual(false)
    expect(result[0].flat).toEqual(null)
    expect(result[0].matchingRule).toEqual({ accountType: { $eq: 'credit' } })
    expect(result[0].createdAt).toEqual(new Date('2021-07-13T16:56:58.322Z'))
    expect(result[0].deletedAt).toEqual(null)
  })

  test('insert multiple rules for an iso', async () => {
    const isoId = '18'
    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 600,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
      {
        percentage: 136000,
        useSplitValues: true,
        matchingRule: { accountType: { $eq: 'debit' } },
      },
      {
        flat: 53000,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    const dbResult: IsoRevenueRule[] = [
      {
        id: '4969b255-d742-4e57-9cfa-715466bcf816',
        iso_id: '18',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 600,
        use_split_values: false,
        flat: null,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-07-14T22:25:31.512Z'),
        deleted_at: null,
      },
      {
        id: 'b53d99be-cf94-483b-84ae-2d8a89036dde',
        iso_id: '18',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 136000,
        use_split_values: true,
        flat: null,
        matching_rule: { accountType: { $eq: 'debit' } },
        created_at: new Date('2021-07-14T22:25:31.512Z'),
        deleted_at: null,
      },
      {
        id: '5d77f127-2be6-4566-973e-1128eeb2d010',
        iso_id: '18',
        merchant_id: null,
        pricing_group_id: null,
        percentage: null,
        use_split_values: false,
        flat: 53000,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-07-14T22:25:31.512Z'),
        deleted_at: null,
      },
    ].map((row) => IsoRevenueRulesRepository.fromDB(row))

    const args = rules.map((r) => {
      const rule = new IsoRevenueRule({
        ...r,
        isoId,
      })
      return rule
    })

    const stub = sinon
      .stub(IsoRevenueRulesRepository, 'insertMany')
      .resolves(dbResult)

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()
    const result = await registerIsoRevenueRule.execute({ isoId }, rules)

    expect(stub.calledWith(args)).toEqual(true)

    expect(result.length).toEqual(3)
    expect(result[0].id).toEqual('4969b255-d742-4e57-9cfa-715466bcf816')
    expect(result[0].isoId).toEqual('18')
    expect(result[0].merchantId).toEqual(null)
    expect(result[0].pricingGroupId).toEqual(null)
    expect(result[0].percentage).toEqual(600)
    expect(result[0].useSplitValues).toEqual(false)
    expect(result[0].flat).toEqual(null)
    expect(result[0].matchingRule).toEqual({ accountType: { $eq: 'credit' } })
    expect(result[0].createdAt).toEqual(new Date('2021-07-14T22:25:31.512Z'))
    expect(result[0].deletedAt).toEqual(null)

    expect(result[1].id).toEqual('b53d99be-cf94-483b-84ae-2d8a89036dde')
    expect(result[1].isoId).toEqual('18')
    expect(result[1].merchantId).toEqual(null)
    expect(result[1].pricingGroupId).toEqual(null)
    expect(result[1].percentage).toEqual(136000)
    expect(result[1].useSplitValues).toEqual(true)
    expect(result[1].flat).toEqual(null)
    expect(result[1].matchingRule).toEqual({ accountType: { $eq: 'debit' } })
    expect(result[1].createdAt).toEqual(new Date('2021-07-14T22:25:31.512Z'))
    expect(result[1].deletedAt).toEqual(null)

    expect(result[2].id).toEqual('5d77f127-2be6-4566-973e-1128eeb2d010')
    expect(result[2].isoId).toEqual('18')
    expect(result[2].merchantId).toEqual(null)
    expect(result[2].pricingGroupId).toEqual(null)
    expect(result[2].percentage).toEqual(null)
    expect(result[2].useSplitValues).toEqual(false)
    expect(result[2].flat).toEqual(53000)
    expect(result[2].matchingRule).toEqual({ accountType: { $eq: 'credit' } })
    expect(result[2].createdAt).toEqual(new Date('2021-07-14T22:25:31.512Z'))
    expect(result[2].deletedAt).toEqual(null)
  })

  test('insert a rule with both flat and percentage for an iso', async () => {
    const targetId: TargetRuleIdentifier = { isoId: 'ISO7' }

    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 10000,
        flat: 400,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    const dbResult: IsoRevenueRule[] = [
      {
        id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
        iso_id: 'ISO7',
        merchant_id: null,
        pricing_group_id: null,
        percentage: 10000,
        use_split_values: true,
        flat: 400,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-08-13T18:37:56.322Z'),
        deleted_at: null,
      },
    ].map((row) => IsoRevenueRulesRepository.fromDB(row))

    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves(dbResult)

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()
    const result = await registerIsoRevenueRule.execute(targetId, rules)

    expect(result).toEqual([
      {
        id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
        isoId: 'ISO7',
        merchantId: null,
        pricingGroupId: null,
        percentage: 10000,
        useSplitValues: true,
        flat: 400,
        matchingRule: { accountType: { $eq: 'credit' } },
        createdAt: new Date('2021-08-13T18:37:56.322Z'),
        deletedAt: null,
      },
    ])
  })

  test('insert a single rule for a merchant', async () => {
    const merchantId = 'merchant_a'
    const rules: IsoRevenueRuleParams[] = [
      {
        flat: 300,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    const dbResult: IsoRevenueRule[] = [
      {
        id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
        iso_id: null,
        merchant_id: 'merchant_a',
        pricing_group_id: null,
        percentage: null,
        use_split_values: false,
        flat: 300,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-07-13T16:56:58.322Z'),
        deleted_at: null,
      },
    ].map((row) => IsoRevenueRulesRepository.fromDB(row))

    const args = rules.map((r) => {
      const rule = new IsoRevenueRule({
        ...r,
        merchantId,
      })
      return rule
    })

    const stub = sinon
      .stub(IsoRevenueRulesRepository, 'insertMany')
      .resolves(dbResult)

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()
    const result = await registerIsoRevenueRule.execute({ merchantId }, rules)

    expect(stub.calledWith(args)).toEqual(true)

    expect(result.length).toEqual(1)
    expect(result[0].id).toEqual('c8eb7cf9-e22a-4275-874b-2eb5d9d38521')
    expect(result[0].isoId).toEqual(null)
    expect(result[0].merchantId).toEqual('merchant_a')
    expect(result[0].pricingGroupId).toEqual(null)
    expect(result[0].percentage).toEqual(null)
    expect(result[0].useSplitValues).toEqual(false)
    expect(result[0].flat).toEqual(300)
    expect(result[0].matchingRule).toEqual({ accountType: { $eq: 'credit' } })
    expect(result[0].createdAt).toEqual(new Date('2021-07-13T16:56:58.322Z'))
    expect(result[0].deletedAt).toEqual(null)
  })

  test('insert multiple rules for a merchant', async () => {
    const merchantId = 'merchant_a'
    const rules: IsoRevenueRuleParams[] = [
      {
        flat: 300,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
      {
        percentage: 136000,
        matchingRule: { accountType: { $eq: 'debit' } },
      },
    ]

    const dbResult: IsoRevenueRule[] = [
      {
        id: '4969b255-d742-4e57-9cfa-715466bcf816',
        iso_id: null,
        merchant_id: 'merchant_a',
        pricing_group_id: null,
        percentage: null,
        use_split_values: false,
        flat: 300,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-07-14T22:25:31.512Z'),
        deleted_at: null,
      },
      {
        id: 'b53d99be-cf94-483b-84ae-2d8a89036dde',
        iso_id: null,
        merchant_id: 'merchant_a',
        pricing_group_id: null,
        percentage: 136000,
        use_split_values: true,
        flat: null,
        matching_rule: { accountType: { $eq: 'debit' } },
        created_at: new Date('2021-07-14T22:25:31.512Z'),
        deleted_at: null,
      },
    ].map((row) => IsoRevenueRulesRepository.fromDB(row))

    const args = rules.map((r) => {
      const rule = new IsoRevenueRule({
        ...r,
        merchantId,
      })
      return rule
    })

    const stub = sinon
      .stub(IsoRevenueRulesRepository, 'insertMany')
      .resolves(dbResult)

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()
    const result = await registerIsoRevenueRule.execute({ merchantId }, rules)

    expect(stub.calledWith(args)).toEqual(true)

    expect(result.length).toEqual(2)
    expect(result[0].id).toEqual('4969b255-d742-4e57-9cfa-715466bcf816')
    expect(result[0].isoId).toEqual(null)
    expect(result[0].merchantId).toEqual('merchant_a')
    expect(result[0].pricingGroupId).toEqual(null)
    expect(result[0].percentage).toEqual(null)
    expect(result[0].useSplitValues).toEqual(false)
    expect(result[0].flat).toEqual(300)
    expect(result[0].matchingRule).toEqual({ accountType: { $eq: 'credit' } })
    expect(result[0].createdAt).toEqual(new Date('2021-07-14T22:25:31.512Z'))
    expect(result[0].deletedAt).toEqual(null)

    expect(result[1].id).toEqual('b53d99be-cf94-483b-84ae-2d8a89036dde')
    expect(result[1].isoId).toEqual(null)
    expect(result[1].merchantId).toEqual('merchant_a')
    expect(result[1].pricingGroupId).toEqual(null)
    expect(result[1].percentage).toEqual(136000)
    expect(result[1].useSplitValues).toEqual(true)
    expect(result[1].flat).toEqual(null)
    expect(result[1].matchingRule).toEqual({ accountType: { $eq: 'debit' } })
    expect(result[1].createdAt).toEqual(new Date('2021-07-14T22:25:31.512Z'))
    expect(result[1].deletedAt).toEqual(null)
  })

  test('insert a rule with both flat and percentage for a merchant', async () => {
    const targetId: TargetRuleIdentifier = { merchantId: 'merchant_a' }

    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 600,
        flat: 300,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    const dbResult: IsoRevenueRule[] = [
      {
        id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
        iso_id: null,
        merchant_id: 'merchant_a',
        pricing_group_id: null,
        percentage: 600,
        use_split_values: true,
        flat: 300,
        matching_rule: { accountType: { $eq: 'credit' } },
        created_at: new Date('2021-08-13T18:37:56.322Z'),
        deleted_at: null,
      },
    ].map((row) => IsoRevenueRulesRepository.fromDB(row))

    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves(dbResult)

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()
    const result = await registerIsoRevenueRule.execute(targetId, rules)

    expect(result).toEqual([
      {
        id: 'c8eb7cf9-e22a-4275-874b-2eb5d9d38521',
        isoId: null,
        merchantId: 'merchant_a',
        pricingGroupId: null,
        percentage: 600,
        useSplitValues: true,
        flat: 300,
        matchingRule: { accountType: { $eq: 'credit' } },
        createdAt: new Date('2021-08-13T18:37:56.322Z'),
        deletedAt: null,
      },
    ])
  })

  test('error when target is not identified', async () => {
    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 600,
        flat: 300,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves([])

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()

    const promise = registerIsoRevenueRule.execute({}, rules)
    await expect(promise).rejects.toThrowError(TargetIdentificationError)
  })

  test.each([
    [{ accountType: 'credit' }, '"credit" is not a valid query.'],
    [{ accountType: { $xor: 'credit' } }, '$xor not supported.'],
    [
      { accountType: ['credit', 'debit'] },
      '"credit,debit" is not a valid query.',
    ],
  ])('invalid matching rule %p', async (matchingRule, errorMessage) => {
    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 10000,
        matchingRule,
      },
    ]

    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves([])

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()

    const promise = registerIsoRevenueRule.execute({ isoId: 'iso' }, rules)
    await expect(promise).rejects.toThrowError(RuleIntegrityError)
    await expect(promise).rejects.toThrowError(errorMessage)
  })

  test.each([
    {
      isoId: '125',
      merchantId: '5124',
      pricingGroupId: undefined,
    },
    {
      isoId: '84',
      merchantId: undefined,
      pricingGroupId: '654',
    },
    {
      isoId: undefined,
      merchantId: '9852',
      pricingGroupId: '128',
    },
    {
      isoId: '992',
      merchantId: '1201',
      pricingGroupId: '456',
    },
  ])('error when target has more than one id: %p', async (targetId) => {
    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 600,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    sinon.stub(IsoRevenueRulesRepository, 'insertMany').resolves([])

    const registerIsoRevenueRule = new RegisterIsoRevenueRule()

    const promise = registerIsoRevenueRule.execute(targetId, rules)
    await expect(promise).rejects.toThrowError(TargetIdentificationError)
  })

  test('error in repository', async () => {
    const targetId: TargetRuleIdentifier = { merchantId: 'merchant_a' }
    const rules: IsoRevenueRuleParams[] = [
      {
        percentage: 700000,
        matchingRule: { accountType: { $eq: 'credit' } },
      },
    ]

    const databaseError = new DatabaseCommunicationError(
      'Error to insert data in iso_revenue_rules'
    )
    sinon.stub(IsoRevenueRulesRepository, 'insertMany').throws(databaseError)

    const registerRevenueRule = new RegisterIsoRevenueRule()

    const promise = registerRevenueRule.execute(targetId, rules)
    await expect(promise).rejects.toThrowError(
      'Error to insert data in iso_revenue_rules'
    )
  })
})
