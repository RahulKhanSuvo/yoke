import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/database/schema',
  out: './src/main/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '/home/rahul/.config/yoke/yoke.db'
  }
})
