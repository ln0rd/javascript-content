import faker from 'faker'

export default function generateIntegrationConfig(name = 'test') {
  return {
    name,
    _id: '5b3d1c99bdea0608e479eb1b',
    variables: {
      baseUrl: 'http://localhost',
      secretKey: faker.random.uuid()
    }
  }
}
