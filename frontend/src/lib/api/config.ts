import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// Get the current project and app context from URL or storage
const getMultiTenantHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {}
  
  // Get from URL path
  const path = window.location.pathname
  const projectMatch = path.match(/\/project\/([^\/]+)/)
  const appMatch = path.match(/\/app\/([^\/]+)/)
  
  // Try to get from localStorage as fallback
  const storedProjectKey = localStorage.getItem('x-project-key')
  const storedAppKey = localStorage.getItem('x-app-key')
  
  // Prefer app key over project key (app is more specific)
  if (appMatch && appMatch[1]) {
    headers['x-app-key'] = appMatch[1]
  } else if (storedAppKey) {
    headers['x-app-key'] = storedAppKey
  } else if (projectMatch && projectMatch[1]) {
    headers['x-project-key'] = projectMatch[1]
  } else if (storedProjectKey) {
    headers['x-project-key'] = storedProjectKey
  }
  
  return headers
}

// Create base API instance
export const createApiInstance = (baseURL: string = ''): AxiosInstance => {
  const instance = axios.create({
    baseURL: baseURL || import.meta.env.VITE_API_URL || 'https://api.fluxturn.com/api/v1',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add multi-tenant headers
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      // Add multi-tenant headers
      const multiTenantHeaders = getMultiTenantHeaders()
      Object.assign(config.headers, multiTenantHeaders)
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        // Handle specific error cases
        switch (error.response.status) {
          case 401:
            // Unauthorized - redirect to login
            localStorage.removeItem('auth_token')
            window.location.href = '/auth/login'
            break
          case 403:
            // Forbidden - show error message
            console.error('Access forbidden:', error.response.data)
            break
          case 404:
            // Not found
            console.error('Resource not found:', error.response.data)
            break
          case 500:
            // Server error
            console.error('Server error:', error.response.data)
            break
        }
      }
      return Promise.reject(error)
    }
  )

  return instance
}

// Default API instance
export const apiClient = createApiInstance()

// Helper to update stored keys
export const updateMultiTenantKeys = (projectKey?: string, appKey?: string) => {
  if (projectKey) {
    localStorage.setItem('x-project-key', projectKey)
  }
  if (appKey) {
    localStorage.setItem('x-app-key', appKey)
    // When setting app key, remove project key as app is more specific
    localStorage.removeItem('x-project-key')
  }
}

// Helper to clear stored keys
export const clearMultiTenantKeys = () => {
  localStorage.removeItem('x-project-key')
  localStorage.removeItem('x-app-key')
}

// Export types for use in other modules
export type { AxiosInstance } from 'axios'