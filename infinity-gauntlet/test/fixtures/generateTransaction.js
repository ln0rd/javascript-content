import faker from 'faker'
import generateCompany from './generateCompany'
import generateSplitRules from './generateSplitRules'

export default function generateTransaction(
  provider = 'hash',
  cardBrand = 'visa',
  status = 'paid',
  amount = 100,
  installments = 1,
  company = generateCompany(),
  splitRules = generateSplitRules(amount, [
    { percentage: 30, company_id: company._id },
    { percentage: 70 }
  ]),
  iso_id = 'iso_a'
) {
  return {
    _id: 40,
    acquirer_name: provider,
    tid: `${faker.finance.account(14)}`,
    is_split_rule_processed: true,
    nsu: `${faker.finance.account(6)}`,
    paid_amount: 100,
    card: {
      first_digits: `${faker.finance.account(5)}`,
      last_digits: `${faker.finance.account(4)}`,
      holder_name: faker.name.findName(),
      valid: 'true',
      brand: cardBrand,
      _id: faker.random.alphaNumeric(24)
    },
    company_id: company._id,
    iso_id,
    metadata:
      '{"leo_amount":30,"marceneiro_amount":70,"marceneiro_liquid_amount":64,"marceneiro_name":"SEU MOVEIS"}',
    created_at: '2017-07-14T17:27:39.744Z',
    installments,
    provider_transaction_id: `${faker.finance.account(14)}`,
    acquirer_response_code: `${faker.finance.account(4)}`,
    affiliation_id: faker.random.alphaNumeric(24),
    split_rules: splitRules,
    amount,
    capture_method: 'emv',
    provider,
    total_fee: 0,
    __v: 0,
    updated_at: '2017-11-22T17:49:47.309Z',
    status,
    payment_method: 'credit_card',
    status_reason: 'acquirer',
    _company_partial: Object.assign({}, company)
  }
}
