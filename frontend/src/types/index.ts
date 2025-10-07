export interface User {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_by?: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  verificationToken?: string; // For development mode
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  file?: FileMetadata;
  file_id?: string;
  secret_key?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface ShareLinkRequest {
  password?: string;
  expires_at?: string;
}

export interface ShareLinkResponse {
  success: boolean;
  message: string;
  share_url?: string;
  expires_at?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}