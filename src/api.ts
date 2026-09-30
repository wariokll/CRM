import type { User } from './types'

let accessToken = sessionStorage.getItem('servio_access_token') ?? ''
let refreshPromise: Promise<boolean> | null = null

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) { super(message) }
}

function errorMessage(data: { message?: string; issues?: unknown }): string {
  if (Array.isArray(data.issues) && data.issues.every(item => typeof item === 'string')) return data.issues.join('\n')
  return data.message ?? 'Не удалось выполнить запрос'
}

function setToken(token: string) {
  accessToken = token
  if (token) sessionStorage.setItem('servio_access_token', token)
  else sessionStorage.removeItem('servio_access_token')
}

async function refresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async response => {
        if (!response.ok) return false
        const data = await response.json() as { accessToken: string }
        setToken(data.accessToken)
        return true
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' })
  if (response.status === 401 && retry && await refresh()) return api<T>(path, options, false)
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string; issues?: unknown }
    throw new ApiError(errorMessage(data), response.status, data)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function login(email: string, password: string) {
  const data = await api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false)
  setToken(data.accessToken)
  return data.user
}

export async function restoreSession(): Promise<User | null> {
  if (!accessToken && !(await refresh())) return null
  try { return await api<User>('/auth/me') }
  catch { setToken(''); return null }
}

export async function logout() {
  try { await api<void>('/auth/logout', { method: 'POST' }, false) } finally { setToken('') }
}
