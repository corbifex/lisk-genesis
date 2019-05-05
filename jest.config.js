module.exports = {
  collectCoverage: true,
  reporters: [
    "default",
    [
      "jest-junit",
      { suiteName: "jest tests" }
    ]
  ],
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'cobertura',
  ]
};
