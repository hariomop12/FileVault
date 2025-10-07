import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/ui/DarkModeToggle';

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
  file_types: Array<{
    category: string;
    count: number;
    size: number;
    size_mb: number;
  }>;
  activity: {
    recent_uploads_7d: number;
    public_files: number;
  };
}

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    file_id: string;
    secret_key: string;
    filename: string;
  } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Upload file with simplified progress tracking
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Start progress simulation
    const simulateProgress = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 5; // 5-25% increments
        if (progress >= 95) {
          progress = 95;
          clearInterval(interval);
        }
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      // Clear progress simulation
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUploadResult({
            file_id: data.data.file_id,
            secret_key: data.data.secret_key || 'N/A (Authenticated upload)',
            filename: data.data.file_name,
          });
          alert(`✅ File uploaded successfully!\nFile ID: ${data.data.file_id}`);
          fetchStats(); // Refresh stats after upload
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
      alert('❌ Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

  // Fetch dashboard stats using the new comprehensive API
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/v1/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else {
        console.error('Failed to fetch stats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);
  
  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-900' 
        : 'bg-gray-50'
    }`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />
      
      {/* Header Section */}
      <div className="px-6 py-8 sm:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Dashboard
            </h1>
            <p className={`mt-2 text-sm transition-colors duration-300 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Welcome back! Here's what's happening with your files.
            </p>
          </div>
          <DarkModeToggle />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Files Card */}
          <div className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-105 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <div className="flex items-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'
              }`}>
                <svg className={`h-6 w-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Files
                </p>
                <p className={`text-2xl font-semibold transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {statsLoading ? '...' : stats?.overview.total_files || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Storage Used Card */}
          <div className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-105 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <div className="flex items-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-50'
              }`}>
                <svg className={`h-6 w-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-16.5 0a3 3 0 013 3v6.75a3 3 0 01-3 3h16.5a3 3 0 01-3-3v-6.75a3 3 0 013-3" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Storage Used
                </p>
                <p className={`text-2xl font-semibold transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {statsLoading ? '...' : `${stats?.overview.storage_used_mb || 0} MB`}
                </p>
                <p className={`text-xs transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  of {stats?.overview.storage_limit_mb || 2048} MB
                </p>
              </div>
            </div>
          </div>

          {/* Recent Uploads Card */}
          <div className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-105 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <div className="flex items-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-50'
              }`}>
                <svg className={`h-6 w-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Recent Uploads
                </p>
                <p className={`text-2xl font-semibold transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {statsLoading ? '...' : stats?.activity.recent_uploads_7d || 0}
                </p>
                <p className={`text-xs transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  this week
                </p>
              </div>
            </div>
          </div>

          {/* Public Files Card */}
          <div className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-105 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <div className="flex items-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-50'
              }`}>
                <svg className={`h-6 w-6 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Public Files
                </p>
                <p className={`text-2xl font-semibold transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {statsLoading ? '...' : stats?.activity.public_files || 0}
                </p>
                <p className={`text-xs transition-colors duration-300 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  shared publicly
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive Stats Dashboard */}
        {stats && !statsLoading && (
          <div className="mb-8">
            <div className={`rounded-xl p-6 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-slate-800 border border-slate-700'
                : 'bg-white border border-gray-200 shadow-lg'
            }`}>
              <h2 className={`text-xl font-semibold mb-6 transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                📊 Storage Overview
              </h2>

              {/* Storage Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Storage Usage
                  </span>
                  <span className={`text-sm transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stats.overview.storage_used_mb} MB / {stats.overview.storage_limit_mb} MB
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.overview.percentage_used, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {stats.overview.percentage_used.toFixed(1)}% used
                  </span>
                  <span className={`text-xs transition-colors duration-300 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {Math.round(stats.overview.remaining_storage / (1024 * 1024))} MB remaining
                  </span>
                </div>
              </div>

              {/* File Type Breakdown */}
              {stats.file_types.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    📁 File Types
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.file_types.map((fileType, index) => (
                      <div key={index} className={`rounded-lg p-4 transition-all duration-300 ${
                        theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium transition-colors duration-300 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {fileType.category}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            theme === 'dark' ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {fileType.count}
                          </span>
                        </div>
                        <div className={`text-lg font-semibold transition-colors duration-300 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {fileType.size_mb} MB
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {((fileType.size / stats.overview.total_storage_used) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Success Notification */}
        {uploadResult && (
          <div className={`mb-6 p-4 rounded-lg border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-green-900/20 border-green-700/50 text-green-300'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">File uploaded successfully!</p>
                <p className="text-sm opacity-75">
                  <span className="font-mono">{uploadResult.filename}</span> • File ID: <span className="font-mono">{uploadResult.file_id}</span>
                </p>
              </div>
              <button 
                onClick={() => setUploadResult(null)}
                className="ml-auto text-current hover:opacity-70"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Actions Card */}
          <div className={`rounded-xl p-6 transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <div className="w-full">
                <button 
                  onClick={triggerFileUpload}
                  disabled={isUploading}
                  className={`w-full flex items-center justify-center p-3 rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload New File
                    </>
                  )}
                </button>
                
                {/* Progress Bar */}
                {isUploading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        Upload Progress
                      </span>
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className={`w-full bg-gray-200 rounded-full h-2 ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => navigate('/files')}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-300 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                Browse Files
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-300 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                Settings
              </button>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className={`rounded-xl p-6 transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Activity
            </h3>
            <div className="space-y-4">
              <div className={`text-center py-8 transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">Upload your first file to get started!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;