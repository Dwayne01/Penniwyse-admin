import { aiApiClient } from '../aiApiClient';
import type { FilesAndJobsResponse, ProcessingJobInfo, FilesAndJobsQueryParams } from '../../types/files-jobs.types';
import type {
  AiCronJobsResponse,
  AiCronStatus,
  TriggerCronJobRequest,
  TriggerCronJobResponse,
  TriggerAllCronJobsRequest,
  TriggerAllCronJobsResponse,
  PauseResumeResponse,
  CronExecutionHistoryResponse,
  CronExecutionHistoryResponseRaw,
  CronJobExecution,
  CronJobExecutionRaw,
  CronExecutionHistoryQueryParams,
} from '../../types/ai-cron.types';
import type {
  AllInsightsRequest,
  AllInsightsResponse,
  AllInsightsResponseRaw,
  PeriodInsightRecord,
  PeriodInsightRecordRaw,
} from '../../types/admin-insights.types';

class FilesJobsService {
  async getFilesAndJobs(params?: FilesAndJobsQueryParams): Promise<FilesAndJobsResponse> {
    console.log('[FilesJobsService] getFilesAndJobs called:', {
      userId: params?.userId,
      page: params?.page,
      limit: params?.limit,
      timestamp: new Date().toISOString(),
    });

    const queryParams: Record<string, string | number> = {};
    if (params?.userId) {
      queryParams.userId = params.userId;
    }
    if (params?.page) {
      queryParams.page = params.page;
    }
    if (params?.limit) {
      queryParams.limit = params.limit;
    }
    
    console.log('[FilesJobsService] Request parameters:', queryParams);

    try {
      console.log('[FilesJobsService] Making request to AI service...');
      const response = await aiApiClient.getClient().get<FilesAndJobsResponse>(
        '/ai/jobs/files-and-jobs',
        {
          params: queryParams,
        }
      );
      
      console.log('[FilesJobsService] Request successful:', {
        filesCount: response.data?.filesCount || 0,
        jobsCount: response.data?.jobsCount || 0,
        userId: response.data?.userId,
        timestamp: response.data?.timestamp,
      });

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; statusText?: string; data?: { message?: string } }; message?: string; isAuthError?: boolean; isNetworkError?: boolean; isRateLimitError?: boolean };
      console.error('[FilesJobsService] Request failed:', {
        status: axiosError?.response?.status,
        statusText: axiosError?.response?.statusText,
        message: axiosError?.response?.data?.message || axiosError?.message,
        errorDetails: axiosError?.response?.data,
        isAuthError: axiosError?.isAuthError,
        isNetworkError: axiosError?.isNetworkError,
        isRateLimitError: axiosError?.isRateLimitError,
      });
      
      // Enhance error with more details
      if (axiosError?.response?.status === 401 || axiosError?.isAuthError) {
        const enhancedError = new Error(axiosError?.response?.data?.message || 'Authentication failed. Please log in again.');
        (enhancedError as { isAuthError?: boolean; response?: unknown }).isAuthError = true;
        (enhancedError as { isAuthError?: boolean; response?: unknown }).response = axiosError.response;
        throw enhancedError;
      }
      
      throw error;
    }
  }

  async retriggerJob(jobId: string): Promise<ProcessingJobInfo> {
    console.log('[FilesJobsService] retriggerJob called:', {
      jobId,
      timestamp: new Date().toISOString(),
    });

    try {
      console.log('[FilesJobsService] Making retrigger request to AI service...');
      const response = await aiApiClient.getClient().post<ProcessingJobInfo>(
        `/ai/jobs/${jobId}/retrigger`,
        {}
      );
      
      console.log('[FilesJobsService] Retrigger successful:', {
        jobId: response.data?.jobId,
        status: response.data?.status,
      });

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; statusText?: string; data?: { message?: string } }; message?: string; isAuthError?: boolean; isNetworkError?: boolean };
      console.error('[FilesJobsService] Retrigger failed:', {
        jobId,
        status: axiosError?.response?.status,
        statusText: axiosError?.response?.statusText,
        message: axiosError?.response?.data?.message || axiosError?.message,
        errorDetails: axiosError?.response?.data,
        isAuthError: axiosError?.isAuthError,
        isNetworkError: axiosError?.isNetworkError,
      });
      
      if (axiosError?.response?.status === 401 || axiosError?.isAuthError) {
        const enhancedError = new Error(axiosError?.response?.data?.message || 'Authentication failed. Please log in again.');
        (enhancedError as { isAuthError?: boolean; response?: unknown }).isAuthError = true;
        (enhancedError as { isAuthError?: boolean; response?: unknown }).response = axiosError.response;
        throw enhancedError;
      }
      
      throw error;
    }
  }

  // AI Cron Management Methods
  async getAiCronJobs(): Promise<AiCronJobsResponse> {
    console.log('[FilesJobsService] getAiCronJobs called');
    try {
      const response = await aiApiClient.getClient().get<AiCronJobsResponse>('/ai/admin/cron/jobs');
      return response.data;
    } catch (error: unknown) {
      console.error('[FilesJobsService] getAiCronJobs failed:', error);
      throw error;
    }
  }

  async getAiCronStatus(): Promise<AiCronStatus> {
    console.log('[FilesJobsService] getAiCronStatus called');
    try {
      const response = await aiApiClient.getClient().get<AiCronStatus>('/ai/admin/cron/status');
      return response.data;
    } catch (error: unknown) {
      console.error('[FilesJobsService] getAiCronStatus failed:', error);
      throw error;
    }
  }

  async triggerAiCronJob(data: TriggerCronJobRequest): Promise<TriggerCronJobResponse> {
    console.log('[FilesJobsService] triggerAiCronJob called:', data);
    
    // Frontend validation
    if (!data.service) {
      throw new Error('Missing required field: service');
    }
    if (!data.jobId) {
      throw new Error('Missing required field: jobId');
    }
    
    try {
      const response = await aiApiClient.getClient().post<TriggerCronJobResponse>(
        '/ai/admin/cron/trigger',
        data
      );
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string; detail?: string; availableJobIds?: string[]; available_job_ids?: string[] } }; message?: string };
      console.error('[FilesJobsService] triggerAiCronJob failed:', error);
      
      // Enhance validation errors with helpful messages
      if (axiosError?.response?.status === 422 || axiosError?.response?.status === 400) {
        const errorData = axiosError?.response?.data || {};
        const errorMessage = errorData.message || errorData.detail || axiosError?.message;
        
        // If the error mentions missing jobId, try to provide helpful context
        if (errorMessage && (errorMessage.includes('jobId') || errorMessage.includes('job_id'))) {
          // Check if backend provided availableJobIds in the error response
          const availableJobIds = errorData.availableJobIds || errorData.available_job_ids;
          
          let enhancedMessage = errorMessage;
          if (availableJobIds && Array.isArray(availableJobIds) && availableJobIds.length > 0) {
            const jobIdsList = availableJobIds.join(', ');
            enhancedMessage = `${errorMessage}\n\nAvailable job IDs for service '${data.service}': ${jobIdsList}`;
          } else if (!errorMessage.includes('Available')) {
            enhancedMessage = `${errorMessage}. Please specify a jobId from the available jobs for service '${data.service}'.`;
          }
          
          const enhancedError = new Error(enhancedMessage);
          (enhancedError as { response?: unknown; isValidationError?: boolean }).response = {
            ...axiosError.response,
            data: {
              ...errorData,
              availableJobIds: availableJobIds || errorData.availableJobIds,
            },
          };
          (enhancedError as { response?: unknown; isValidationError?: boolean }).isValidationError = true;
          throw enhancedError;
        }
      }
      
      throw error;
    }
  }

  async pauseAiCronService(serviceName: string): Promise<PauseResumeResponse> {
    console.log('[FilesJobsService] pauseAiCronService called:', serviceName);
    try {
      const response = await aiApiClient.getClient().post<PauseResumeResponse>(
        `/ai/admin/cron/pause/${serviceName}`
      );
      return response.data;
    } catch (error: unknown) {
      console.error('[FilesJobsService] pauseAiCronService failed:', error);
      throw error;
    }
  }

  async resumeAiCronService(serviceName: string): Promise<PauseResumeResponse> {
    console.log('[FilesJobsService] resumeAiCronService called:', serviceName);
    try {
      const response = await aiApiClient.getClient().post<PauseResumeResponse>(
        `/ai/admin/cron/resume/${serviceName}`
      );
      return response.data;
    } catch (error: unknown) {
      console.error('[FilesJobsService] resumeAiCronService failed:', error);
      throw error;
    }
  }

  async getCronExecutionHistory(params?: CronExecutionHistoryQueryParams): Promise<CronExecutionHistoryResponse> {
    console.log('[FilesJobsService] getCronExecutionHistory called:', params);
    try {
      // Transform query params from camelCase to snake_case for backend
      const backendParams: Record<string, string | number | undefined> = {};
      if (params?.serviceName) backendParams.service_name = params.serviceName;
      if (params?.jobId) backendParams.job_id = params.jobId;
      if (params?.status) backendParams.status = params.status;
      if (params?.limit) backendParams.limit = params.limit;
      if (params?.offset) backendParams.offset = params.offset;
      if (params?.startDate) backendParams.start_date = params.startDate;
      if (params?.endDate) backendParams.end_date = params.endDate;

      const response = await aiApiClient.getClient().get<CronExecutionHistoryResponseRaw>(
        '/ai/admin/cron/history',
        { params: backendParams }
      );
      
      // Transform response from snake_case to camelCase
      const transformedExecutions: CronJobExecution[] = (response.data.executions || []).map(
        (exec: CronJobExecutionRaw) => ({
          id: exec.id,
          jobId: exec.job_id,
          jobName: exec.job_name,
          serviceName: exec.service_name,
          status: exec.status,
          startedAt: exec.started_at,
          completedAt: exec.completed_at ?? undefined,
          durationSeconds: exec.duration_seconds ?? undefined,
          errorMessage: exec.error_message ?? undefined,
          executionDetails: exec.execution_details ?? undefined,
          createdAt: exec.created_at,
        })
      );

      return {
        executions: transformedExecutions,
        total: response.data.count || 0,
        limit: response.data.limit || 50,
        offset: response.data.offset || 0,
      };
    } catch (error: unknown) {
      console.error('[FilesJobsService] getCronExecutionHistory failed:', error);
      throw error;
    }
  }

  async triggerAllAiCronJobs(data: TriggerAllCronJobsRequest): Promise<TriggerAllCronJobsResponse> {
    console.log('[FilesJobsService] triggerAllAiCronJobs called:', data);
    
    // Frontend validation
    if (!data.service) {
      throw new Error('Missing required field: service');
    }
    
    try {
      const response = await aiApiClient.getClient().post<TriggerAllCronJobsResponse>(
        '/ai/admin/cron/trigger-all',
        data
      );
      return response.data;
    } catch (error: unknown) {
      console.error('[FilesJobsService] triggerAllAiCronJobs failed:', error);
      throw error;
    }
  }

  // Admin Insights Methods
  async getAllInsights(params?: AllInsightsRequest): Promise<AllInsightsResponse> {
    console.log('[FilesJobsService] getAllInsights called:', params);
    try {
      // Transform request params from camelCase to snake_case for backend
      const backendParams: Record<string, string | number | undefined> = {};
      if (params?.userId) backendParams.user_id = params.userId;
      if (params?.profileType) backendParams.profile_type = params.profileType;
      if (params?.insightType) backendParams.insight_type = params.insightType;
      if (params?.startDate) backendParams.start_date = params.startDate;
      if (params?.endDate) backendParams.end_date = params.endDate;
      if (params?.source) backendParams.source = params.source;
      if (params?.limit) backendParams.limit = params.limit;
      if (params?.offset) backendParams.offset = params.offset;

      const response = await aiApiClient.getClient().post<AllInsightsResponseRaw>(
        '/ai/admin/insights/all',
        backendParams
      );
      
      // Transform response - API returns camelCase directly, but we need to handle userId as string/number
      const transformedInsights: PeriodInsightRecord[] = (response.data.insights || []).map(
        (insight: PeriodInsightRecordRaw, index: number) => {
          // Generate a unique ID if not provided (using userId + generatedAt + index)
          const userIdNum = typeof insight.userId === 'string' ? parseInt(insight.userId, 10) : insight.userId;
          const id = insight.id 
            ? String(insight.id) 
            : `${insight.userId}-${insight.generatedAt}-${index}`;
          
          return {
            id,
            userId: userIdNum,
            profileType: insight.profileType,
            insightType: insight.insightType,
            periodStart: insight.periodStart ?? undefined,
            periodEnd: insight.periodEnd ?? undefined,
            summaryMessage: insight.summaryMessage,
            details: insight.details || insight.data || {},
            currency: insight.currency ?? undefined,
            generatedAt: insight.generatedAt,
            source: insight.source,
            data: insight.data || insight.details || {},
            createdAt: insight.createdAt,
            updatedAt: insight.updatedAt,
          };
        }
      );

      return {
        insights: transformedInsights,
        totalCount: response.data.totalCount || 0,
        returnedCount: response.data.returnedCount || transformedInsights.length,
        limit: response.data.limit || 1000,
        offset: response.data.offset || 0,
      };
    } catch (error: unknown) {
      console.error('[FilesJobsService] getAllInsights failed:', error);
      throw error;
    }
  }
}

export const filesJobsService = new FilesJobsService();

