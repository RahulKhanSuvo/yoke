import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import solidPlugin from 'eslint-plugin-solid'
import solidConfig from 'eslint-plugin-solid/configs/typescript'

export default defineConfig(
  {
    ignores: ['**/node_modules', '**/dist', '**/out']
  },

  tseslint.configs.recommended,

  {
    // SolidJS, not React: use the Solid plugin's TypeScript preset.
    files: ['src/renderer/src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      solid: solidPlugin
    },
    ...solidConfig,
    rules: {
      ...solidConfig.rules,
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  },

  {
    files: ['src/main/**/*.{js,jsx,ts,tsx}', 'src/preload/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ]
    }
  },

  eslintConfigPrettier
)
