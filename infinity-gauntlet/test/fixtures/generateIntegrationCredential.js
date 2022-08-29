import faker from 'faker'

export default function generateIntegrationCredential() {
  return {
    _id: `${faker.finance.account(14)}`,
    updated_at: '2017-05-24T22:08:13.129Z',
    password: faker.internet.password(),
    __v: 0,
    created_at: '2017-05-24T22:08:13.129Z',
    name: faker.internet.userName(),
    username: faker.internet.userName(),
    key: `${faker.random.number()}`,
    company_id: `${faker.finance.account(14)}`
  }
}
