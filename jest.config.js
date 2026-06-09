export default {
  testEnvironment: 'node', // Ensures Jest runs in a Node-like environment

 // Check every file in src, but skip the config and index files because we have nothing to test in those files.
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/**/index.js',
  ],  

// Ignore node_modules when collecting coverage
  coveragePathIgnorePatterns: ['/node_modules/'], 

// Look for files that end in .test.js or .spec.js, or are in a tests folder and end in .js   
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'], 

// It tells jest to tranform jsfiles.
  transform: {
    "^.+\\.js$": "babel-jest"
  },
};

// Coverage is a metric that tells you what percentage of your source code is being executed by your test