import R from 'ramda'
import Provider from 'application/core/models/provider'
import { findOne } from 'application/core/repositories/base'

export const aSubaquirer = () => ({
  provider_type: 'subacquirer',
  enabled: true
})

export const byTransaction = ({ provider }) =>
  R.merge({ name: provider }, aSubaquirer())

export default {
  aSubaquirer,
  byTransaction,
  findOne: R.partial(findOne, [Provider])
}
