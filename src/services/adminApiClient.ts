import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types/api.types';
import * as cookieUtils from '../utils/cookies';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
const SERVICE_TOKEN = import.meta.env.VITE_SERVICE_TOKEN;

class AdminApiClient {
  private client: AxiosInstance;

  constructor() {
    if (!SERVICE_TOKEN) {
      console.warn('VITE_SERVICE_TOKEN is not set. Admin API calls will fail.');
    }

    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': SERVICE_TOKEN || '',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - ensure service token and JWT token are present
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (!SERVICE_TOKEN && config.headers) {
          console.error('Service token is missing. Cannot make admin API request.');
        }
        if (config.headers) {
          config.headers['X-Service-Token'] = SERVICE_TOKEN || '';
          
          // Add JWT token for admin endpoints that require user authentication
          const token = cookieUtils.getAccessToken();
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        // Handle network errors (connection refused, etc.)
        if (!error.response) {
          console.error('Admin API Network Error:', {
            message: error.message,
            baseURL: API_BASE_URL,
            url: error.config?.url,
            fullUrl: error.config ? `${API_BASE_URL}${error.config.url}` : 'N/A',
          });
          
          if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            console.error(`Cannot connect to backend at ${API_BASE_URL}. Make sure the backend server is running.`);
          }
          
          const portMessage = API_BASE_URL.includes('https://') 
            ? '' 
            : ' Please ensure the backend is running.';
          return Promise.reject({
            ...error,
            message: `Cannot connect to backend server at ${API_BASE_URL}.${portMessage}`,
            isNetworkError: true,
          });
        }

        // Handle 401 - invalid service token
        if (error.response?.status === 401) {
          console.error('Invalid service token. Check VITE_SERVICE_TOKEN environment variable.');
        }

        return Promise.reject(error);
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

export const adminApiClient = new AdminApiClient();

