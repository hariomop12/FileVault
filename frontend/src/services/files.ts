import api from './auth';
import { FileMetadata, FileUploadResponse, PaginatedResponse, ShareLinkRequest, ShareLinkResponse, ApiResponse } from '../types';

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