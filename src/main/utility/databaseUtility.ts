import { integer } from 'drizzle-orm/sqlite-core'
import { randomUUID } from 'node:crypto'

export const Timestamps = {
  time_created: integer()
    .notNull()
    .$default(() => Date.now()),
  time_updated: integer()
    .notNull()
    .$onUpdate(() => Date.now())
}

export const createId = {
  project: () => `pro_${randomUUID()}`,
  session: () => `ses_${randomUUID()}`,
  message: () => `msg_${randomUUID()}`,
  part: () => `prt_${randomUUID()}`
}
