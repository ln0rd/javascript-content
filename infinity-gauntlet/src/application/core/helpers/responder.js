import R from 'ramda'

export function mapModel(model, formater) {
  if (R.is(Array, model)) {
    return R.map(m => {
      return formater(m)
    }, model)
  }

  return formater(model)
}
