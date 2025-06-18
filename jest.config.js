module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  moduleFileExtensions: ['js', 'ts', 'json', 'node'],
  testMatch: ['**/src/**/*.test.(js|ts)'],
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};