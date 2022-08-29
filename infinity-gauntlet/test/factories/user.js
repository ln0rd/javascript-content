import faker from 'faker'
import mongoose from 'mongoose'
import User from 'application/core/models/user'

const ObjectId = mongoose.Types.ObjectId

export default async function UserFactory(company) {
  const user = {
    _id: ObjectId(),
    updated_at: '2021-03-31T14:25:16.882Z',
    created_at: '2021-03-31T14:25:16.882Z',
    name: faker.name.findName(),
    email: faker.internet.email(),
    status: 'active',
    validation_status: 'pending',
    document_number: '',
    phone_number: null,
    activation_token: `${faker.random.alphaNumeric(50)}`,
    permissions: [
      {
        updated_at: '2021-03-31T14:25:16.882Z',
        created_at: '2021-03-30T19:32:48.185Z',
        company_id: company._id,
        permission: 'admin',
        _id: ObjectId()
      }
    ],
    __v: 13,
    user_metadata: {
      data: 'data'
    }
  }

  const userSaved = await User.create(user)
  const { _id: userId } = userSaved

  company.users = company.users ? [...company.users, userId] : [userId]

  await company.save()

  return userSaved
}
