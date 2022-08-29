import faker from 'faker'

/**
 * @typedef SplitRuleParameter
 * @type {object}
 * @property {number} percentage - a 0-100 number with this split's percentage.
 * @property {string} company_id - the ID of the company this split is related to.
 * @property {boolean} charge_processing_cost
 */

/**
 * Generates fixtures for Split Rules according to the parameters for testing purposes.
 * @param totalAmount {number} The total amount of the transaction.
 * @param parameters {SplitRuleParameter[]} The parameters according to which we should generate split rules for test.
 */
export default function generateSplitRules(totalAmount, parameters) {
  const baseSplitData = {
    charge_processing_cost: false,
    company_id: faker.random.alphaNumeric(24),
    amount: 30,
    provider_object_id: faker.random.uuid(),
    _id: faker.random.alphaNumeric(24),
    is_provider_object_id_refunded: false,
    processed: 'true'
  }

  return parameters.map(param =>
    Object.assign({}, baseSplitData, {
      company_id: param.company_id,
      amount: Math.round(param.percentage / 100 * totalAmount),
      charge_processing_cost: param.charge_processing_cost
    })
  )
}
