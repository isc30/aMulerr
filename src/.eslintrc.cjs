const baseConfig = require("../.eslintrc.cjs")

/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...baseConfig,
  root: true,
  overrides: [
    ...baseConfig.overrides.map((override) => {
      if (override.parser !== "@typescript-eslint/parser") {
        return override
      }

      return {
        ...override,
        parser: require.resolve("@typescript-eslint/parser"),
      }
    }),
    {
      files: ["server.js"],
      env: {
        node: true,
      },
    },
  ],
}
