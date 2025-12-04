import { useState, useEffect, useRef } from 'react';
import { Eye, RefreshCw, Search, MessageSquare, Link as LinkIcon, FileText, Image, Video, File } from 'lucide-react';
import { Card, Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '../components/ui';
import { feedbackService } from '../services/api/feedback.service';
import type { Feedback, FeedbackQueryParams, FeedbackStatus } from '../types/feedback.types';
import { formatDate, formatDateTime } from '../utils/formatters';

export function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedbackQueryParams>({ page: 1, limit: 20 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadFeedbacks();
  }, [filters]);

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm || undefined, page: 1 }));
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await feedbackService.getFeedbacks(filters);
      setFeedbacks(response?.items || []);
      setPagination(response?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err: any) {
      // Handle 404 - endpoint might not exist yet
      if (err?.response?.status === 404) {
        setError('Feedbacks endpoint not available. The backend endpoint /api/admin/feedbacks may not be implemented yet.');
      } else {
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load feedbacks';
        setError(errorMessage);
      }
      console.error('Failed to load feedbacks:', err);
      setFeedbacks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };

  const handleStatusFilterChange = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? (status as FeedbackStatus) : undefined,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const getStatusBadgeColor = (status: FeedbackStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'triaged':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
        return <File className="w-4 h-4" />;
      case 'url':
        return <LinkIcon className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const renderAttachment = (attachment: any) => {
    const { type, url, filename } = attachment;

    switch (type) {
      case 'image':
        return (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Image className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {filename || 'Image'}
              </span>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={url}
                alt={filename || 'Attachment'}
                className="max-w-full h-auto rounded-lg border border-gray-200 max-h-96 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
            >
              Open full size
            </a>
          </div>
        );

      case 'video':
        return (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {filename || 'Video'}
              </span>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <video
                src={url}
                controls
                className="w-full max-h-96"
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'p-4 text-center text-gray-500';
                  errorDiv.textContent = 'Video not available';
                  target.parentElement?.appendChild(errorDiv);
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
            >
              Open in new tab
            </a>
          </div>
        );

      case 'url':
        return (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">URL</span>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 break-all"
            >
              {url}
            </a>
          </div>
        );

      case 'text':
        return (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {filename || 'Text Content'}
              </span>
            </div>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans max-h-96 overflow-auto">
              {url}
            </pre>
          </div>
        );

      case 'document':
      default:
        return (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getAttachmentIcon(type)}
              <span className="text-sm font-medium text-gray-700">
                {filename || 'Document'}
              </span>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <File className="w-4 h-4" />
              Download or view document
            </a>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600 mt-1">View and manage user feedbacks</p>
        </div>
        <Button onClick={loadFeedbacks} disabled={isLoading} variant="secondary">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by subject or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <Table isLoading={isLoading} emptyMessage="No feedbacks found">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>User Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.map((feedback) => (
              <TableRow key={feedback.id}>
                <TableCell>{feedback.id}</TableCell>
                <TableCell className="font-medium max-w-xs truncate" title={feedback.subject}>
                  {feedback.subject}
                </TableCell>
                <TableCell>{feedback.userEmail || `User ${feedback.userId || 'N/A'}`}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeColor(feedback.status)}`}>
                    {feedback.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </TableCell>
                <TableCell>{formatDate(feedback.createdAt)}</TableCell>
                <TableCell>{formatDate(feedback.updatedAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleViewDetails(feedback)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
              onItemsPerPageChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
            />
          </div>
        )}
      </Card>

      {/* Feedback Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFeedback(null);
        }}
        title={`Feedback Details #${selectedFeedback?.id || ''}`}
        size="lg"
      >
        {selectedFeedback && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`px-2 py-1 text-xs rounded inline-block ${getStatusBadgeColor(selectedFeedback.status)}`}>
                  {selectedFeedback.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <p className="text-sm text-gray-900">
                  {selectedFeedback.userEmail || `User ID: ${selectedFeedback.userId || 'N/A'}`}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                <p className="text-sm text-gray-900">{formatDateTime(selectedFeedback.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
                <p className="text-sm text-gray-900">{formatDateTime(selectedFeedback.updatedAt)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <p className="text-sm text-gray-900 font-medium">{selectedFeedback.subject}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedFeedback.message}</p>
              </div>
            </div>

            {selectedFeedback.metadata && Object.keys(selectedFeedback.metadata).length > 0 && (
              <div>
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                      <label className="block text-sm font-medium text-gray-700 cursor-pointer">
                        Metadata
                      </label>
                      <span className="text-xs text-gray-500 group-open:hidden">Click to expand</span>
                      <span className="text-xs text-gray-500 hidden group-open:inline">Click to collapse</span>
                    </div>
                  </summary>
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <pre className="text-xs text-gray-800 overflow-auto max-h-96 whitespace-pre-wrap font-mono">
                      {JSON.stringify(selectedFeedback.metadata, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments ({selectedFeedback.attachments.length})
                </label>
                <div className="space-y-4">
                  {selectedFeedback.attachments.map((attachment, index) => (
                    <div key={attachment.id || index} className="border border-gray-200 rounded-lg p-4">
                      {renderAttachment(attachment)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!selectedFeedback.attachments || selectedFeedback.attachments.length === 0) &&
              !selectedFeedback.metadata && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No additional information available.
                </div>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}

