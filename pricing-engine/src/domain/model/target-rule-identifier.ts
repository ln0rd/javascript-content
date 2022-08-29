import { Nullable } from 'helpers/types'

export interface TargetRuleIdentifier {
  isoId?: Nullable<string>
  merchantId?: Nullable<string>
  pricingGroupId?: Nullable<string>
}
