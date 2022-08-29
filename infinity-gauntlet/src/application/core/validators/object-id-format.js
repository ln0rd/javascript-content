import { database } from 'framework/core/adapters/database'

export default {
  name: 'object_id',
  type: 'format',
  handler: value => {
    return database.Types.ObjectId.isValid(value)
  }
}
