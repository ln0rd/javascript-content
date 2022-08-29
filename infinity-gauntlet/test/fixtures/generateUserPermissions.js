import mongoose from 'mongoose'

const ObjectId = mongoose.Types.ObjectId

export default function generateUserPermissions(permissions_count = 3) {
  const permissions = [...Array(permissions_count)].map(() => {
    return {
      _id: ObjectId(),
      company_id: ObjectId().toString(),
      permission: 'admin'
    }
  })

  return permissions
}
