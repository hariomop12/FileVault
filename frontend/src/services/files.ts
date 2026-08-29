import api from './auth';
import { FileMetadata, FileUploadResponse, PaginatedResponse, ShareLinkRequest, ShareLinkResponse, ApiResponse } from '../types';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const fileService = {
  // Anonymous file operations
  async uploadAnonymous(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async downloadAnonymous(fileId: string, secretKey: string): Promise<ApiResponse> {
    const response = await api.post('/api/v1/files/download', {
      file_id: fileId,
      secret_key: secretKey,
    });
    return response.data;
  },

  // Authenticated file operations
  async uploadAuthenticated(file: File, folder?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }
    
    const response = await api.post('/api/v1/user/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Resumable chunked multipart upload (slices file, parallel presigned-part upload, progress)
  async multipartUpload(file: File, onProgress?: (percent: number) => void): Promise<string> {
    const totalSize = file.size;

    // 1. Initiate
    const initRes = await api.post('/api/v1/user/files/multipart/initiate', {
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      total_size: totalSize,
    });
    const initData = initRes.data.data;
    const uploadId = initData.upload_id;
    const totalParts = initData.total_parts;
    const partSize = initData.part_size;

    const uploadedParts: { PartNumber: number; ETag: string }[] = [];
    const CONCURRENCY = 4;
    let uploadedBytes = 0;

    // 2. Upload each part to its presigned R2 URL (with basic retry)
    const uploadPart = async (partNumber: number): Promise<void> => {
      const start = (partNumber - 1) * partSize;
      const blob = file.slice(start, Math.min(start + partSize, totalSize));

      let attempts = 0;
      for (;;) {
        try {
          const urlRes = await api.post('/api/v1/user/files/multipart/part-url', {
            upload_id: uploadId,
            part_number: partNumber,
          });
          const presignedUrl = urlRes.data.data.url;

          const putRes = await fetch(presignedUrl, {
            method: 'PUT',
            body: blob,
          });
          if (!putRes.ok) throw new Error(`Part ${partNumber} failed with ${putRes.status}`);
          uploadedBytes += blob.size;
          if (onProgress) {
            onProgress(Math.round((uploadedBytes / totalSize) * 100));
          }
          uploadedParts.push({ PartNumber: partNumber, ETag: putRes.headers.get('etag') || '' });
          return;
        } catch (err) {
          attempts += 1;
          if (attempts >= 3) throw err;
          await sleep(500 * attempts);
        }
      }
    };

    for (let i = 0; i < totalParts; i += CONCURRENCY) {
      const batch = [];
      for (let p = i + 1; p <= Math.min(i + CONCURRENCY, totalParts); p++) {
        batch.push(uploadPart(p));
      }
      await Promise.all(batch);
    }

    // 3. Complete
    const completeRes = await api.post('/api/v1/user/files/multipart/complete', {
      upload_id: uploadId,
      parts: uploadedParts,
    });
    // eslint-disable-next-line
    return completeRes.data.data.location || '';
  },

  async getUserFiles(page = 1, limit = 10): Promise<PaginatedResponse<FileMetadata>> {
    const response = await api.get(`/api/v1/user/files?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getFileMetadata(fileId: string): Promise<ApiResponse<FileMetadata>> {
    const response = await api.get(`/api/v1/user/files/${fileId}`);
    return response.data;
  },

  async getDownloadLink(fileId: string): Promise<ApiResponse<{ download_url: string }>> {
    const response = await api.get(`/api/v1/user/files/${fileId}/download`);
    return response.data;
  },

  async deleteFile(fileId: string): Promise<ApiResponse> {
    const response = await api.delete(`/api/v1/user/files/${fileId}`);
    return response.data;
  },

  async createShareableLink(fileId: string, options?: ShareLinkRequest): Promise<ShareLinkResponse> {
    const response = await api.post(`/api/v1/user/files/${fileId}/share`, options || {});
    return response.data;
  },
};