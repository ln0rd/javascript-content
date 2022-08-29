import R from 'ramda'

export const type = providerType => ({ provider_type: providerType })

//****************************************************************************************************************//

export const asSubaquirer = provider => R.merge(provider, type('subacquirer'))

//****************************************************************************************************************//

export const provider = () => ({
  name: 'default',
  enabled: true,
  provider_type: 'subacquirer'
})

export const subacquirer = () => R.compose(asSubaquirer)(provider())
