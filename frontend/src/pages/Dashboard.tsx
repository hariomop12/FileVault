import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

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

const StatCard = ({ icon, label, value, sub, color, theme }: any) => (
  <div className={`group relative overflow-hidden rounded-2xl p-6 card-hover ${
    theme === 'dark'
      ? 'bg-gray-900 border border-gray-800'
      : 'bg-white border border-gray-200 shadow-sm'
  }`}>
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${color} opacity-[0.03]`} />
    <div className="relative flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
        {sub && <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ file_id: string; secret_key: string; filename: string } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
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
      const response = await fetch('/api/v1/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUploadResult({
            file_id: data.data.file_id,
            secret_key: data.data.secret_key || 'N/A (Authenticated upload)',
            filename: data.data.file_name,
          });
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
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
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

  useEffect(() => { fetchStats(); }, []);

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="*/*" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Welcome back! Here's your storage overview.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          theme={theme}
          label="Total Files"
          value={statsLoading ? (
            <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ) : stats?.overview.total_files || 0}
          sub={null}
          color="from-blue-500 to-indigo-500"
          icon={
            <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          }
        />
        <StatCard
          theme={theme}
          label="Storage Used"
          value={statsLoading ? (
            <div className="h-7 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ) : `${stats?.overview.storage_used_mb || 0} MB`}
          sub={statsLoading ? null : `of ${stats?.overview.storage_limit_mb || 2048} MB`}
          color="from-emerald-500 to-teal-500"
          icon={
            <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-16.5 0a3 3 0 013 3v6.75a3 3 0 01-3 3h16.5a3 3 0 01-3-3v-6.75a3 3 0 013-3" />
            </svg>
          }
        />
        <StatCard
          theme={theme}
          label="Recent Uploads"
          value={statsLoading ? (
            <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ) : stats?.activity.recent_uploads_7d || 0}
          sub="this week"
          color="from-purple-500 to-pink-500"
          icon={
            <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          }
        />
        <StatCard
          theme={theme}
          label="Public Files"
          value={statsLoading ? (
            <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ) : stats?.activity.public_files || 0}
          sub="shared publicly"
          color="from-orange-500 to-amber-500"
          icon={
            <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          }
        />
      </div>

      {/* Storage Overview */}
      {stats && !statsLoading && (
        <div className={`rounded-2xl p-6 mb-8 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Storage Overview
          </h2>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Storage Usage
              </span>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {stats.overview.storage_used_mb} MB / {stats.overview.storage_limit_mb} MB
              </span>
            </div>
            <div className={`h-3 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(stats.overview.percentage_used, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {stats.overview.percentage_used.toFixed(1)}% used
              </span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {Math.round(stats.overview.remaining_storage / (1024 * 1024))} MB remaining
              </span>
            </div>
          </div>

          {stats.file_types.length > 0 && (
            <div>
              <h3 className={`text-base font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                File Types
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.file_types.map((fileType, index) => (
                  <div key={index} className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {fileType.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {fileType.count} files
                      </span>
                    </div>
                    <div className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {fileType.size_mb} MB
                    </div>
                    <div className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {((fileType.size / stats.overview.total_storage_used) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Success Notification */}
      {uploadResult && (
        <div className={`mb-6 p-4 rounded-xl border animate-scale-in ${
          theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">File uploaded successfully!</p>
              <p className="text-sm opacity-80 truncate">
                <span className="font-mono">{uploadResult.filename}</span> &middot; ID: <span className="font-mono">{uploadResult.file_id}</span>
              </p>
            </div>
            <button onClick={() => setUploadResult(null)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`rounded-2xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h3 className={`text-lg font-bold mb-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={triggerFileUpload}
              disabled={isUploading}
              className={`w-full flex items-center justify-center gap-3 p-3.5 rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload New File
                </>
              )}
            </button>
            {isUploading && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Progress</span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{uploadProgress}%</span>
                </div>
                <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            <button onClick={() => navigate('/files')} className={`w-full flex items-center gap-3 p-3.5 rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5 ${
              theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              Browse Files
            </button>
            <button onClick={() => navigate('/settings')} className={`w-full flex items-center gap-3 p-3.5 rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5 ${
              theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Settings
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h3 className={`text-lg font-bold mb-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
          <div className={`text-center py-10 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <svg className="w-14 h-14 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs mt-1">Upload your first file to get started!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
