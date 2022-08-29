export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePaths: ['<rootDir>/src/'],
  testRegex: '.(spec|e2e).ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  maxWorkers: 1,
  globalSetup: '<rootDir>/jest.setup.global.ts',
  setupFiles: ['<rootDir>/jest.setup.silent.ts'],
}
