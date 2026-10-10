module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start --port 3100',
      url: [
        'http://localhost:3100/',
        'http://localhost:3100/auth',
        'http://localhost:3100/quiz',
        'http://localhost:3100/quiz?skip=true',
        'http://localhost:3100/library',
        'http://localhost:3100/learn/web',
      ],
      numberOfRuns: 3,
      settings: {
        throttlingMethod: 'devtools',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638,
          requestLatencyMs: 150,
          downloadThroughputKbps: 1638,
          uploadThroughputKbps: 750,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1 }],
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median' },
        ],
        'resource-summary:script:size': [
          'error',
          { maxNumericValue: 204800, aggregationMethod: 'median' },
        ],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
