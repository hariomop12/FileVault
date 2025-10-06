import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/ui/DarkModeToggle';

interface FileItem {
  id: number;
  filename: string;
  file_size: number;
  upload_date: string;
  file_type: string;
  is_public: boolean;
  folder_path: string;
}

const Files: React.FC = () => {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch user files
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Auth token:', token ? 'Present' : 'Missing');
      
      const response = await fetch('http://localhost:3000/api/v1/files', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📁 Files data:', data);
        setFiles(data.files || []);
      } else {
        console.error('❌ Failed to fetch files:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload file
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3000/api/v1/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ File uploaded successfully!');
        fetchFiles(); // Refresh file list
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        alert('✅ File deleted successfully!');
        fetchFiles(); // Refresh file list
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Delete failed. Please try again.');
    }
  };

  // Download file
  const handleDownloadFile = async (fileId: number, filename: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.download_url) {
          const link = document.createElement('a');
          link.href = data.download_url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('❌ Download failed. Please try again.');
    }
  };

  // Create shareable link
  const handleCreateShareLink = async (fileId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/v1/files/${fileId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.share_url) {
          navigator.clipboard.writeText(data.share_url);
          alert('🔗 Share link copied to clipboard!');
        }
      } else {
        throw new Error('Share link creation failed');
      }
    } catch (error) {
      console.error('Share link error:', error);
      alert('❌ Failed to create share link. Please try again.');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📁';
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    console.log('🔐 Auth status check:');
    console.log('  Token:', token ? 'Present' : 'Missing');
    console.log('  User:', user ? JSON.parse(user) : 'Missing');
    
    if (!token) {
      console.log('⚠️ No auth token found, user may need to login');
    }
    
    fetchFiles();
  }, []);

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />

      {/* Header */}
      <div className="px-6 py-8 sm:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className={`text-3xl font-bold transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              My Files
            </h1>
            <p className={`mt-2 text-sm transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Manage your uploaded files and folders
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <button
              onClick={triggerFileUpload}
              disabled={uploading}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Upload File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400 focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
              }`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className={`p-2 rounded-lg transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-gray-300'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              {viewMode === 'grid' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className={`rounded-xl p-8 text-center transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <svg className={`animate-spin h-8 w-8 mx-auto mb-4 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Loading your files...
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          /* Empty State */
          <div className={`rounded-xl p-12 text-center transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <svg className={`h-16 w-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-300'
            }`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {searchTerm ? 'No files found' : 'No files yet'}
            </h3>
            <p className={`transition-colors duration-300 mb-6 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {searchTerm ? 'Try adjusting your search terms' : 'Upload your first file to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={triggerFileUpload}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Upload Your First File
              </button>
            )}
          </div>
        ) : (
          /* Files Grid/List */
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`group rounded-xl p-6 transition-all duration-300 hover:scale-105 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border border-slate-700 hover:border-blue-500/50'
                    : 'bg-white border border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-xl'
                }`}
              >
                {/* File Icon and Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{getFileIcon(file.file_type)}</span>
                    <div>
                      <h3 className={`font-medium truncate transition-colors duration-300 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {file.filename}
                      </h3>
                      <p className={`text-sm transition-colors duration-300 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                  </div>
                  {file.is_public && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      theme === 'dark'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      Public
                    </span>
                  )}
                </div>

                {/* Upload Date */}
                <p className={`text-xs mb-4 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Uploaded {new Date(file.upload_date).toLocaleDateString()}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile(file.id, file.filename);
                    }}
                    className={`flex-1 py-2 px-3 text-xs rounded-lg transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateShareLink(file.id);
                    }}
                    className={`py-2 px-3 text-xs rounded-lg transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                    className="py-2 px-3 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Files;