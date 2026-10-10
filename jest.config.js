module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/config/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-.*|react-redux|@react-navigation)/)',
  ],
};
