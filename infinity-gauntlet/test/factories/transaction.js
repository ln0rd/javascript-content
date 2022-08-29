import faker from 'faker'
import mongoose from 'mongoose'

import Transaction from 'application/core/models/transaction'
import SplitRuleFactory from './splitRule'
import CompanyFactory from './company'

const ObjectId = mongoose.Types.ObjectId

export default async function TransactionFactory(
  provider = 'hash',
  cardBrand = 'visa',
  status = 'paid',
  amount = 100,
  installments = 1,
  _company = CompanyFactory(),
  splitRules = [SplitRuleFactory()]
) {
  const company = await _company

  const transaction = {
    _id: new Date().getTime(),
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
      _id: ObjectId()
    },
    company_id: company._id.toString(),
    iso_id: company.parent_id,
    _company_partial: {
      name: company.name,
      document_number: company.document_number,
      document_type: company.document_type,
      full_name: company.full_name,
      company_metadata: company.company_metadata,
      created_at: company.created_at
    },
    metadata:
      '{"leo_amount":30,"marceneiro_amount":70,"marceneiro_liquid_amount":64,"marceneiro_name":"SEU MOVEIS"}',
    created_at: '2017-07-14T17:27:39.744Z',
    installments,
    provider_transaction_id: `${faker.finance.account(14)}`,
    acquirer_response_code: `${faker.finance.account(4)}`,
    affiliation_id: ObjectId(),
    split_rules: splitRules,
    amount,
    capture_method: 'emv',
    provider,
    total_fee: 0,
    __v: 0,
    updated_at: '2017-11-22T17:49:47.309Z',
    status,
    payment_method: 'credit_card',
    status_reason: 'acquirer'
  }
  return await Transaction.create(transaction)
}
