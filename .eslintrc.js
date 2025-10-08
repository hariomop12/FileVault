module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-console': 'off', // Allow console.log for server logging
    'no-debugger': 'error',
    'no-alert': 'error',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'warn',
    
    // Async/Promise handling
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'no-promise-executor-return': 'error',
    
    // Style consistency
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // Function and variable naming
    'camelcase': ['warn', { properties: 'never' }],
    'no-underscore-dangle': 'off',
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'frontend/',
    'logs/',
    'docs/',
    'postman/',
    '*.log',
    '.env*',
    'combined.log',
    'error.log'
  ]
};