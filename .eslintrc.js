module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.eslint.json",
    extraFileExtensions: [".js"]
  },
  plugins: ["@typescript-eslint", "only-warn"],
  extends: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended"
  ],
  rules: {
    "arrow-parens": ["off"],
    "comma-dangle": ["error", "never"],
    "import/no-unresolved": ["off"],
    "linebreak-style": "off",
    "max-len": ["error", { code: 120 }],
    "no-console": "off",
    "no-param-reassign": ["error", { props: false }],
    "no-plusplus": "off",
    "object-curly-newline": "off",
    "padded-blocks": [
      "error",
      {
        blocks: "never",
        classes: "always",
        switches: "never"
      }
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off"
  },
  overrides: [
    {
      files: ["**/*.js"],
      rules: {
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off"
      }
    },
    {
      files: ["**/*.spec.ts"],
      rules: {
        "padded-blocks": "off", // I like padding my describe blocks
        "@typescript-eslint/unbound-method": "off" // Complains about expect(instance.method)...
      }
    }
  ]
}
