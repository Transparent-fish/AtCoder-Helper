module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
    },
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    env: {
        node: true,
        browser: true,
        es2021: true,
    },
    ignorePatterns: [
        "**/node_modules/**",
        "**/dist/**",
        "**/out/**",
        "**/out-test/**",
        "**/.turbo/**",
        "**/release/**",
        "**/*.js",
    ],
    rules: {
        "no-undef": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-empty": ["warn", { allowEmptyCatch: true }],
    },
};
