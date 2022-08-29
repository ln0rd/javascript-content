export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePaths: ['<rootDir>/src/'],
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  globalSetup: '<rootDir>/jest.setup.global.ts',
  setupFiles: ['<rootDir>/jest.setup.silent.ts'],
}
