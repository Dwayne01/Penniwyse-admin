import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types/api.types';
import * as cookieUtils from '../utils/cookies';

const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'http://localhost:8000';
const SERVICE_TOKEN = import.meta.env.VITE_SERVICE_TOKEN;
const SERVICE_NAME = import.meta.env.VITE_SERVICE_NAME || 'taxable-backend';

class AiApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: AI_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for sending cookies in cross-origin requests
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = cookieUtils.getAccessToken();
        
        // Log request preparation
        console.log('[AiApiClient] Preparing request:', {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
          hasToken: !!token,
          tokenLength: token?.length || 0,
          hasServiceToken: !!SERVICE_TOKEN,
          serviceName: SERVICE_NAME,
        });

        if (!config.headers) {
          config.headers = {} as any;
        }

        // Add service token and service name
        config.headers['X-Service-Token'] = SERVICE_TOKEN || '';
        config.headers['X-Service'] = SERVICE_NAME;

        // Always get the latest token from cookies (in case it was refreshed)
        // This ensures we use the newest token even for retries
        const latestToken = cookieUtils.getAccessToken();
        if (latestToken) {
          config.headers['Authorization'] = `Bearer ${latestToken}`;
          console.log('[AiApiClient] Authorization header added:', {
            headerPreview: `Bearer ${latestToken.substring(0, 20)}...`,
            fullHeaderLength: `Bearer ${latestToken}`.length,
            tokenChanged: token !== latestToken,
          });
        } else {
          console.warn('[AiApiClient] No access token found. Request may fail with 401.');
        }

        // Log final headers (without sensitive data)
        console.log('[AiApiClient] Request headers:', {
          hasAuthorization: !!config.headers['Authorization'],
          authorizationPreview: config.headers['Authorization'] 
            ? `${String(config.headers['Authorization']).substring(0, 30)}...` 
            : 'none',
          hasXServiceToken: !!config.headers['X-Service-Token'],
          xServiceTokenLength: (config.headers['X-Service-Token'] as string)?.length || 0,
          xServiceTokenPreview: config.headers['X-Service-Token'] 
            ? `${String(config.headers['X-Service-Token']).substring(0, 10)}...` 
            : 'none',
          xService: config.headers['X-Service'],
          contentType: config.headers['Content-Type'],
          withCredentials: config.withCredentials,
        });

        // Log the actual request URL that will be called
        const fullUrl = `${config.baseURL || AI_BASE_URL}${config.url}`;
        console.log('[AiApiClient] Final request details:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullUrl,
          params: config.params,
        });

        return config;
      },
      (error) => {
        console.error('[AiApiClient] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and log responses
    this.client.interceptors.response.use(
      (response) => {
        console.log('[AiApiClient] Request successful:', {
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          dataKeys: response.data ? Object.keys(response.data) : [],
        });
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        console.error('[AiApiClient] Request failed:', {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.message || error.message,
          errorDetails: error.response?.data,
          hasRetry: originalRequest?._retry,
        });

        // Handle network errors
        if (!error.response) {
          console.error('[AiApiClient] Network Error:', {
            message: error.message,
            baseURL: AI_BASE_URL,
            url: originalRequest?.url,
            fullUrl: originalRequest ? `${AI_BASE_URL}${originalRequest.url}` : 'N/A',
          });
          
          if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            console.error(`[AiApiClient] Cannot connect to AI service at ${AI_BASE_URL}. Make sure the AI service is running.`);
          }
          
          // Extract port from URL if present, otherwise suggest default
          let portMessage = '';
          try {
            const urlObj = new URL(AI_BASE_URL);
            const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '8000');
            portMessage = urlObj.port 
              ? `on port ${port}` 
              : `(default port ${port} if not specified)`;
          } catch {
            // If URL parsing fails, check if URL contains a port
            const portMatch = AI_BASE_URL.match(/:(\d+)/);
            if (portMatch) {
              portMessage = `on port ${portMatch[1]}`;
            } else {
              portMessage = '(default port 8000 if not specified)';
            }
          }
          
          return Promise.reject({
            ...error,
            message: `Cannot connect to AI service at ${AI_BASE_URL}. Please ensure the AI service is running ${portMessage}.`,
            isNetworkError: true,
          });
        }

        // Handle 401 - authentication required
        if (error.response?.status === 401) {
          // Log full error response for debugging
          const errorData = error.response?.data;
          console.error('[AiApiClient] 401 Unauthorized - Full error response:', {
            url: originalRequest?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,
            data: errorData,
            dataType: typeof errorData,
            dataKeys: errorData && typeof errorData === 'object' ? Object.keys(errorData) : [],
            message: (typeof errorData === 'object' && errorData && 'message' in errorData ? (errorData as any).message : null) || 
                     (typeof errorData === 'object' && errorData && 'error' in errorData && typeof (errorData as any).error === 'object' && (errorData as any).error && 'message' in (errorData as any).error ? (errorData as any).error.message : null),
            error: typeof errorData === 'object' && errorData && 'error' in errorData ? (errorData as any).error : null,
            details: (typeof errorData === 'object' && errorData && 'details' in errorData ? (errorData as any).details : null) || 
                    (typeof errorData === 'object' && errorData && 'error' in errorData && typeof (errorData as any).error === 'object' && (errorData as any).error && 'details' in (errorData as any).error ? (errorData as any).error.details : null),
            requiredHeaders: (typeof errorData === 'object' && errorData && 'details' in errorData && typeof (errorData as any).details === 'object' && (errorData as any).details && 'required_headers' in (errorData as any).details ? (errorData as any).details.required_headers : null) ||
                            (typeof errorData === 'object' && errorData && 'error' in errorData && typeof (errorData as any).error === 'object' && (errorData as any).error && 'details' in (errorData as any).error && typeof (errorData as any).error.details === 'object' && (errorData as any).error.details && 'required_headers' in (errorData as any).error.details ? (errorData as any).error.details.required_headers : null),
            // Log what headers were sent
            sentHeaders: {
              authorization: originalRequest?.headers?.['Authorization'] ? 'present' : 'missing',
              xServiceToken: originalRequest?.headers?.['X-Service-Token'] ? 'present' : 'missing',
              xService: originalRequest?.headers?.['X-Service'] ? 'present' : 'missing',
            },
          });
          
          // Try to refresh token once if not already retried
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = cookieUtils.getRefreshToken();
            
            if (refreshToken) {
              try {
                // Use existing refresh promise if one is in progress to prevent concurrent refreshes
                if (!this.refreshTokenPromise) {
                  console.log('[AiApiClient] Starting token refresh for AI service...');
                  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
                  
                  this.refreshTokenPromise = axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    { refreshToken },
                    { withCredentials: true }
                  ).then((refreshResponse) => {
                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data.tokens;
                    
                    // Store both tokens immediately
                    cookieUtils.setAccessToken(newAccessToken);
                    cookieUtils.setRefreshToken(newRefreshToken);
                    
                    console.log('[AiApiClient] Token refresh successful - both tokens stored:', {
                      accessTokenLength: newAccessToken?.length || 0,
                      refreshTokenLength: newRefreshToken?.length || 0,
                      accessTokenPreview: newAccessToken ? `${newAccessToken.substring(0, 20)}...` : 'none',
                    });
                    
                    // Clear the promise so future refreshes can proceed
                    this.refreshTokenPromise = null;
                    
                    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
                  }).catch((refreshError: any) => {
                    // Clear the promise on error so retries can happen
                    this.refreshTokenPromise = null;
                    throw refreshError;
                  });
                } else {
                  console.log('[AiApiClient] Token refresh already in progress, waiting for completion...');
                }
                
                // Wait for the refresh to complete (either existing or new)
                const { accessToken: newAccessToken } = await this.refreshTokenPromise;
                
                // Update the Authorization header with the new token
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                
                console.log('[AiApiClient] Using refreshed token, retrying AI request');
                return this.client(originalRequest);
              } catch (refreshError: any) {
                console.error('[AiApiClient] Token refresh failed for AI service:', {
                  status: refreshError?.response?.status,
                  message: refreshError?.response?.data?.message || refreshError?.message,
                  isRateLimit: refreshError?.response?.status === 429,
                });
                
                // If rate limited, don't clear tokens - just reject with a helpful message
                if (refreshError?.response?.status === 429) {
                  return Promise.reject({
                    ...error,
                    message: 'Too many token refresh attempts. Please wait a moment and try again.',
                    isAuthError: true,
                    isRateLimitError: true,
                  });
                }
                
                // For other refresh errors, clear tokens and reject
                cookieUtils.clearTokens();
                return Promise.reject({
                  ...error,
                  message: 'Authentication expired for AI service. Please log in again.',
                  isAuthError: true,
                });
              }
            } else {
              console.error('[AiApiClient] No refresh token available for AI service');
              cookieUtils.clearTokens();
              return Promise.reject({
                ...error,
                message: 'No refresh token available. Please log in again.',
                isAuthError: true,
              });
            }
          }
          
          // If already retried or no refresh token, extract error message and reject
          let errorMessage = 'Authentication required. Please log in to access AI endpoints.';
          if (typeof errorData === 'object' && errorData && 'error' in errorData && typeof (errorData as any).error === 'object' && (errorData as any).error && 'message' in (errorData as any).error) {
            errorMessage = (errorData as any).error.message;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
          
          return Promise.reject({
            ...error,
            message: errorMessage,
            isAuthError: true,
          });
        }

        // Handle 429 - rate limiting
        if (error.response?.status === 429) {
          console.warn('[AiApiClient] Rate limited. Too many requests.');
          return Promise.reject({
            ...error,
            message: 'Too many requests. Please wait a moment and try again.',
            isRateLimitError: true,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

export const aiApiClient = new AiApiClient();

