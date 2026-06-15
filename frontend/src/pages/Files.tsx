import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface FileItem {
  id: number;
  filename: string;
  file_size: string;
  created_at: string;
  file_type: string;
  is_public: boolean;
  download_url: string;
}

interface UserStats {
  overview: {
    total_files: number;
    total_storage_used: number;
    storage_limit: number;
    storage_used_mb: number;
    storage_limit_mb: number;
    percentage_used: number;
    remaining_storage: number;
  };
  file_types: Array<{ category: string; count: number; size: number; size_mb: number }>;
  activity: { recent_uploads_7d: number; public_files: number };
}

const getFileTypeBadge = (fileType: string): { color: string; icon: string } => {
  if (fileType.startsWith('image/')) return { color: 'from-pink-500 to-rose-500', icon: '🖼️' };
  if (fileType.startsWith('video/')) return { color: 'from-purple-500 to-violet-500', icon: '🎥' };
  if (fileType.startsWith('audio/')) return { color: 'from-amber-500 to-orange-500', icon: '🎵' };
  if (fileType.includes('pdf')) return { color: 'from-red-500 to-red-600', icon: '📄' };
  if (fileType.includes('word') || fileType.includes('document')) return { color: 'from-blue-500 to-blue-600', icon: '📝' };
  if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('sheet')) return { color: 'from-emerald-500 to-emerald-600', icon: '📊' };
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return { color: 'from-cyan-500 to-cyan-600', icon: '📦' };
  return { color: 'from-gray-500 to-gray-600', icon: '📁' };
};

const Files: React.FC = () => {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/files', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.data?.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    const simulateProgress = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 5;
        if (progress >= 95) { progress = 95; clearInterval(interval); }
        setUploadProgress(Math.round(progress));
      }, 200);
      return interval;
    };
    const progressInterval = simulateProgress();
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchFiles();
          fetchStats();
        } else {
          throw new Error(data.message || 'Upload failed');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (response.ok) {
        fetchFiles();
        fetchStats();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const handleDownloadFile = async (file: FileItem) => {
    try {
      if (file.download_url) {
        const link = document.createElement('a');
        link.href = file.download_url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      alert('Download failed. Please try again.');
    }
  };

  const handleCreateShareLink = async (fileId: number) => {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/share`, {
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
          alert('Share link copied to clipboard!');
        }
      } else {
        throw new Error('Share link creation failed');
      }
    } catch (error) {
      alert('Failed to create share link.');
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const formatFileSize = (bytes: string | number): string => {
    const bytesNum = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (bytesNum === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));
    return parseFloat((bytesNum / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, []);

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="*/*" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>My Files</h1>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Manage your uploaded files
          </p>
        </div>
        <button
          onClick={triggerFileUpload}
          disabled={uploading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {uploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {uploadProgress}%
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Upload File
            </>
          )}
        </button>
      </div>

      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Upload Progress</span>
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{uploadProgress}%</span>
          </div>
          <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Stats */}
      {statsLoading ? (
        <div className={`rounded-2xl p-6 mb-8 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-center gap-3 py-4">
            <svg className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading your stats...</p>
          </div>
        </div>
      ) : stats ? (
        <div className={`rounded-2xl p-6 mb-8 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MiniStat theme={theme} label="Storage Used" value={`${stats.overview.storage_used_mb} MB`} sub={`of ${stats.overview.storage_limit_mb} MB`} bar={stats.overview.percentage_used} />
            <MiniStat theme={theme} label="Total Files" value={stats.overview.total_files} sub="files uploaded" />
            <MiniStat theme={theme} label="Recent Activity" value={stats.activity.recent_uploads_7d} sub="uploads this week" />
            <MiniStat theme={theme} label="Public Files" value={stats.activity.public_files} sub="publicly shared" />
          </div>
          {stats.file_types.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>File Types</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.file_types.map((ft, i) => (
                  <div key={i} className={`rounded-xl px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ft.category}</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{ft.count} files</span>
                    </div>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{ft.size_mb} MB</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <svg className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border input-focus ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className={`p-2.5 rounded-xl border transition-all duration-200 ${
            theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
          }`}
        >
          {viewMode === 'grid' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
            </svg>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className={`rounded-2xl p-12 text-center ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <svg className={`w-8 h-8 mx-auto mb-4 animate-spin ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading your files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className={`rounded-2xl p-14 text-center ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {searchTerm ? 'No files found' : 'No files yet'}
          </h3>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {searchTerm ? 'Try adjusting your search terms' : 'Upload your first file to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={triggerFileUpload}
              className={`px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-blue-500/20`}
            >
              Upload Your First File
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
          : 'space-y-3'
        }>
          {filteredFiles.map((file) => {
            const badge = getFileTypeBadge(file.file_type);
            return viewMode === 'grid' ? (
              <div key={file.id} className={`group rounded-2xl p-5 card-hover ${theme === 'dark' ? 'bg-gray-900 border border-gray-800 hover:border-blue-500/30' : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-xl shadow-lg shrink-0`}>
                    {badge.icon}
                  </div>
                  {file.is_public && (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                      Public
                    </span>
                  )}
                </div>
                <h3 className={`font-semibold text-sm mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} title={file.filename}>
                  {file.filename}
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>{formatFileSize(file.file_size)}</span>
                  <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>&middot;</span>
                  <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>{new Date(file.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(file); }}
                    className="flex-1 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                    Download
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleCreateShareLink(file.id); }}
                    className={`py-2 px-3 text-xs font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    Share
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                    className="py-2 px-3 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div key={file.id} className={`group flex items-center gap-4 rounded-xl px-5 py-4 card-hover ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-lg shadow-lg shrink-0`}>
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{file.filename}</p>
                  <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formatFileSize(file.file_size)} &middot; {new Date(file.created_at).toLocaleDateString()}
                    {file.is_public && <span className="ml-2 text-emerald-500 font-medium">Public</span>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownloadFile(file)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                    Download
                  </button>
                  <button onClick={() => handleCreateShareLink(file.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    Share
                  </button>
                  <button onClick={() => handleDeleteFile(file.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ theme, label, value, sub, bar }: any) => (
  <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
    <div className="flex items-center justify-between mb-1">
      <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
    </div>
    <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    {sub && <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</div>}
    {bar !== undefined && (
      <div className={`h-1.5 mt-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${Math.min(bar, 100)}%` }} />
      </div>
    )}
  </div>
);

export default Files;
