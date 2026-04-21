import axios from 'axios'

/** EstateScout API — backend at http://localhost:8000 */
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api',
  headers: { 'Content-Type': 'application/json' },
})

/**
 * @param {string} message
 * @returns {Promise<{ reply: string, session_id: string, agent_steps: unknown, properties: unknown[] }>}
 */
export async function sendMessage(message) {
  const { data } = await api.post('/chat', { message, session_id: 'default_user' })
  return data
}

/**
 * @param {object} [filters]
 * @param {number} [filters.maxPrice]
 * @param {number} [filters.minBedrooms]
 * @param {boolean} [filters.petFriendly]
 * @param {string} [filters.city]
 * @returns {Promise<{ properties: unknown[] }>}
 */
export async function getProperties(filters = {}) {
  const params = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value
    }
  }
  const { data } = await api.get('/properties', { params })
  return data
}

/**
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
export async function getAgentStatus(sessionId) {
  const { data } = await api.get(`/agent/status/${encodeURIComponent(sessionId)}`)
  return data
}

/**
 * @param {string} address
 * @returns {Promise<unknown>}
 */
export async function searchMap(address) {
  const { data } = await api.post('/map/search', { address })
  return data
}
