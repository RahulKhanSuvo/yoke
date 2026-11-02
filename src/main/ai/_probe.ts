import { z } from 'zod'
import type { $ZodType } from 'zod/v4/core'

const schema = z.object({ a: z.string() })

const check: $ZodType<{ a: string }, any> = schema

export { check }
