/**
 * Here we check if in payload default_split_rules the company_id sender
 * @see https://github.com/hashlab/infinity-gauntlet/issues/476
 * @param {Object} defaultSplitRules Object from payload that represents default_split_rules
 * @param {Compony} company Company model
 */
export function hasCurrentCompanyIdInSplitRules(defaultSplitRules, companyId) {
  const companyIds = defaultSplitRules.map(splitRule => splitRule.company_id)
  return companyIds.includes(companyId)
}
