import faker from 'faker'
import mongoose from 'mongoose'
import generateUserPermissions from './generateUserPermissions'

const ObjectId = mongoose.Types.ObjectId

export default function generateUser(
  permissions,
  id = ObjectId(),
  name = 'hasher',
  email = 'hasher@hash.com.br',
  document_number = faker.random.alphaNumeric(11),
  document_type = 'cpf',
  phone_number = faker.random.alphaNumeric(11),
  status = 'active',
  validation_status = 'pending',
  permissions_count = 3
) {
  const user = {
    _id: id,
    name: name,
    email: email,
    document_number: document_number,
    document_type: document_type,
    phone_number: phone_number,
    status: status,
    validation_status: validation_status,
    permissions:
      permissions !== undefined
        ? permissions
        : generateUserPermissions(permissions_count),
    save: () => user
  }

  return user
}
