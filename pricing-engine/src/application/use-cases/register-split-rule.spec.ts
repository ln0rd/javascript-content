import { SplitInstructionParams } from 'domain/model/split-instruction'
import { SplitRule, SplitRuleParams } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { RuleIntegrityError } from 'errors/rule-integrity-error'
import { SplitInstructionError } from 'errors/split-instruction-error'
import { TargetIdentificationError } from 'errors/target-identification-error'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import * as sinon from 'sinon'
import { RegisterSplitRule } from './register-split-rule'

describe('RegisterSplitRule', () => {
  afterEach(() => {
    return sinon.restore()
  })

  describe('for transactions under an ISO', () => {
    const isoId = 'ISOAAA123'

    test('inserting a single Split Rule', async () => {
      const splitRules: SplitRuleParams[] = [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ] as SplitInstructionParams[],
        },
      ]

      const dbResult: SplitRule[] = [
        SplitRulesRepository.fromDB(
          {
            id: '36abd3c0-6b94-41c3-80db-6f1bfee182b1',
            iso_id: 'ISOAAA123',
            merchant_id: null,
            pricing_group_id: null,
            matching_rule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
            created_at: new Date('2021-07-30T18:38:10.452Z'),
            deleted_at: null,
          },
          [
            {
              id: '48ab2ec2-ea68-4f77-b627-0decac0b52e9',
              split_rule_id: '36abd3c0-6b94-41c3-80db-6f1bfee182b1',
              merchant_id: 'MER123123',
              percentage: 7000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
            {
              id: '700efea4-8a27-4a4a-8dd8-cf94f438b045',
              split_rule_id: '36abd3c0-6b94-41c3-80db-6f1bfee182b1',
              merchant_id: 'MER999999',
              percentage: 3000000,
              created_at: new Date('2021-07-30T18:38:10.452Z'),
              deleted_at: null,
            },
          ]
        ),
      ]

      sinon.stub(SplitRulesRepository, 'insertMany').resolves(dbResult)

      const registerSplitRule = new RegisterSplitRule()
      const result = await registerSplitRule.execute({ isoId }, splitRules)

      expect(result).toEqual([
        {
          id: '36abd3c0-6b94-41c3-80db-6f1bfee182b1',
          isoId: 'ISOAAA123',
          merchantId: null,
          pricingGroupId: null,
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          createdAt: new Date('2021-07-30T18:38:10.452Z'),
          deletedAt: null,
          instructions: [
            {
              id: '48ab2ec2-ea68-4f77-b627-0decac0b52e9',
              splitRuleId: '36abd3c0-6b94-41c3-80db-6f1bfee182b1',
              merchantId: 'MER123123',
              percentage: 7000000,
              createdAt: new Date('2021-07-30T18:38:10.452Z'),
              deletedAt: null,
            },
            {
              id: '700efea4-8a27-4a4a-8dd8-cf94f438b045',
              splitRuleId: '36abd3c0-6b94-41c3-80db-6f1bfee182b1',
              merchantId: 'MER999999',
              percentage: 3000000,
              createdAt: new Date('2021-07-30T18:38:10.452Z'),
              deletedAt: null,
            },
          ],
        },
      ])
    })
  })

  describe('validation errors', () => {
    test('error when target is not identified', async () => {
      const splitRules: SplitRuleParams[] = [
        {
          matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ]

      sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

      const registerSplitRule = new RegisterSplitRule()

      const isoId = undefined as unknown as string
      const promise = registerSplitRule.execute({ isoId }, splitRules)
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
      const rules: SplitRuleParams[] = [
        {
          matchingRule,
          instructions: [
            { merchantId: 'MER123123', percentage: 7000000 },
            { merchantId: 'MER999999', percentage: 3000000 },
          ],
        },
      ]

      sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

      const registerSplitRule = new RegisterSplitRule()

      const promise = registerSplitRule.execute({ isoId: 'iso' }, rules)
      await expect(promise).rejects.toThrowError(RuleIntegrityError)
      await expect(promise).rejects.toThrowError(errorMessage)
    })

    test.each([
      [
        'sum is not 100',
        [
          {
            matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
            instructions: [
              { merchantId: 'MER123123', percentage: 6000000 },
              { merchantId: 'MER999999', percentage: 3000000 },
            ],
          },
        ],
      ],
      [
        'percentage is negative',
        [
          {
            matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
            instructions: [
              { merchantId: 'MER123123', percentage: 13000000 },
              { merchantId: 'MER999999', percentage: -3000000 },
            ],
          },
        ],
      ],
      [
        'percentage is zero',
        [
          {
            matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
            instructions: [
              { merchantId: 'MER123123', percentage: 0 },
              { merchantId: 'MER999999', percentage: 10000000 },
            ],
          },
        ],
      ],
    ])(
      'error when %p',
      async (reason: string, splitRules: SplitRuleParams[]) => {
        sinon.stub(SplitRulesRepository, 'insertMany').resolves([])

        const registerIsoRevenueRule = new RegisterSplitRule()

        const promise = registerIsoRevenueRule.execute(
          { isoId: 'ISO5123' },
          splitRules
        )
        await expect(promise).rejects.toThrowError(SplitInstructionError)
      }
    )
  })

  test('error in repository', async () => {
    const targetId: TargetRuleIdentifier = { merchantId: 'merchant_a' }
    const rules: SplitRuleParams[] = [
      {
        matchingRule: { 'paymentNetworkData.alphaCode': { $eq: 'MCC' } },
        instructions: [
          { merchantId: 'MER123123', percentage: 7000000 },
          { merchantId: 'MER999999', percentage: 3000000 },
        ],
      },
    ]

    const databaseError = new DatabaseCommunicationError(
      'Error to insert data in split rule tables'
    )
    sinon.stub(SplitRulesRepository, 'insertMany').throws(databaseError)

    const registerSplitRule = new RegisterSplitRule()

    const promise = registerSplitRule.execute(targetId, rules)
    await expect(promise).rejects.toThrowError(
      'Error to insert data in split rule tables'
    )
  })
})
