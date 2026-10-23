module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['tests/emulator/**/*.cjs'],
      env: {node: true},
      parserOptions: {ecmaVersion: 2022, sourceType: 'script'},
    },
  ],
};
