import { collection, getDocs, query, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { apiClient } from '../apiClient';
import type {
  WaitlistUser,
  WaitlistQueryParams,
  WaitlistResponse,
  SendEmailDto,
  SendEmailResponse,
} from '../../types/waitlist.types';

class WaitlistService {
  async getWaitlistUsers(params?: WaitlistQueryParams): Promise<WaitlistResponse> {
    try {
      const waitlistRef = collection(db, 'waitlist');
      
      // Order by createdAt descending (newest first)
      // Note: For better performance with large datasets, consider using startAfter for pagination
      let q = query(waitlistRef, orderBy('createdAt', 'desc'));

      // Fetch all documents (or a large batch if search is needed)
      // For production, implement proper pagination with startAfter
      const maxLimit = params?.search ? 1000 : (params?.limit || 100);
      q = query(q, firestoreLimit(maxLimit));

      const querySnapshot = await getDocs(q);
      const allUsers: WaitlistUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Handle Firebase Timestamp conversion
        let createdAt: Date;
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }

        const user: WaitlistUser = {
          id: doc.id,
          email: data.email || '',
          name: data.name || data.fullName || undefined,
          createdAt,
          metadata: data.metadata || {},
        };

        // Apply client-side search filter if provided
        if (params?.search) {
          const searchLower = params.search.toLowerCase();
          const matchesSearch =
            user.email.toLowerCase().includes(searchLower) ||
            (user.name && user.name.toLowerCase().includes(searchLower));
          if (matchesSearch) {
            allUsers.push(user);
          }
        } else {
          allUsers.push(user);
        }
      });

      // Apply pagination
      const limitValue = params?.limit || 100;
      const offset = params?.offset || 0;
      const paginatedUsers = allUsers.slice(offset, offset + limitValue);
      const total = allUsers.length;

      return {
        users: paginatedUsers,
        total,
        limit: limitValue,
        offset,
      };
    } catch (error) {
      console.error('Error fetching waitlist users from Firebase:', error);
      throw new Error('Failed to fetch waitlist users from Firebase');
    }
  }

  async sendEmail(data: SendEmailDto): Promise<SendEmailResponse> {
    try {
      // Email sending still goes through backend
      const response = await apiClient.getClient().post<SendEmailResponse>(
        '/api/admin/waitlist/send-email',
        data
      );
      return response.data;
    } catch (error: any) {
      // Handle 404 - endpoint might not exist yet
      if (error?.response?.status === 404) {
        throw new Error('Email sending endpoint not available. The backend endpoint /api/admin/waitlist/send-email may not be implemented yet.');
      }
      throw error;
    }
  }

  async sendEmailToMultiple(emails: string[], subject: string, text?: string, html?: string): Promise<SendEmailResponse> {
    // Send emails one by one since the API expects a single email per request
    const results: { success: boolean; email: string }[] = [];
    let sentCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    for (const email of emails) {
      try {
        await this.sendEmail({
          email,
          subject,
          text,
          html,
        });
        sentCount++;
        results.push({ success: true, email });
      } catch (error: any) {
        failedCount++;
        failedEmails.push(email);
        results.push({ success: false, email });
        console.error(`Failed to send email to ${email}:`, error);
      }
    }

    return {
      success: failedCount === 0,
      message: `Sent ${sentCount} email(s), ${failedCount} failed`,
      sentCount,
      failedCount,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
    };
  }
}

export const waitlistService = new WaitlistService();

