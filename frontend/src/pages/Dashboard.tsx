import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/ui/DarkModeToggle';

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    file_id: string;
    secret_key: string;
    filename: string;
  } | null>(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    storageUsed: 0,
    recentUploads: 0,
  });

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
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
        if (data.data) {
          setUploadResult({
            file_id: data.data.file_id,
            secret_key: data.data.secret_key,
            filename: data.data.file_name,
          });
          alert(`✅ File uploaded successfully!\nFile ID: ${data.data.file_id}`);
          fetchStats(); // Refresh stats after upload
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
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

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const files = data.files || [];
        const totalSize = files.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0);
        const recentCount = files.filter((file: any) => {
          const uploadDate = new Date(file.upload_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return uploadDate > weekAgo;
        }).length;

        setStats({
          totalFiles: files.length,
          storageUsed: totalSize,
          recentUploads: recentCount,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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
                  {stats.totalFiles}
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
                  {formatFileSize(stats.storageUsed)}
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
                  {stats.recentUploads}
                </p>
              </div>
            </div>
          </div>
        </div>

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
                    Uploading...
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