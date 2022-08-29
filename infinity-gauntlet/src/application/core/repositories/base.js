import R from 'ramda'

export function findOne(Queryable, ...queryParts) {
  return Queryable.findOne(R.mergeAll([{}, ...queryParts]))
    .lean()
    .exec()
}
