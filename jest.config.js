module.exports = {
    moduleFileExtensions: [
        "ts",
        "js",
        "json"
    ],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest"
    },
    testMatch: [
        "<rootDir>/test/**/*.test.(ts)"
    ],
    testEnvironment: "node",
    collectCoverageFrom: [
        "<rootDir>/src/**/*.(ts)",
        "!<rootDir>/src/**/*.d.ts"
    ]
};