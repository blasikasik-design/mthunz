const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://nthuzi.onrender.com"

export function apiUrl(path: string) {
  if (import.meta.env.DEV) return path
  return new URL(path, API_BASE_URL).toString()
}
