import keytar from 'keytar'
import type { ProviderId } from './catalog'

const SERVICE_NAME = 'yoke-ai'

export const credentialService = {
  async save(providerId: ProviderId, apiKey: string) {
    await keytar.setPassword(SERVICE_NAME, providerId, apiKey)
  },

  async get(providerId: ProviderId) {
    return keytar.getPassword(SERVICE_NAME, providerId)
  },

  async remove(providerId: ProviderId) {
    return keytar.deletePassword(SERVICE_NAME, providerId)
  }
}
