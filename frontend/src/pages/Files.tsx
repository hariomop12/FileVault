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

interface FolderItem {
  id: number;
  name: string;
  file_count: string;
  total_size: string;
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
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar') || fileType.includes('7z')) return { color: 'from-cyan-500 to-cyan-600', icon: '📦' };
  return { color: 'from-gray-500 to-gray-600', icon: '📁' };
};

const canPreview = (_fileType: string): boolean => true;

const Files: React.FC = () => {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareFileId, setShareFileId] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sendingShare, setSendingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const token = () => localStorage.getItem('auth_token');

  const fetchFiles = async (folderId: number | null = selectedFolderId) => {
    try {
      setLoading(true);
      const url = folderId ? `/api/v1/folders/${folderId}` : '/api/v1/files';
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token()}` } });
      if (response.ok) {
        const data = await response.json();
        if (folderId) {
          setFiles(data.data?.files || []);
        } else {
          setFiles(data.data?.files || []);
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      setFolderLoading(true);
      const response = await fetch('/api/v1/folders', { headers: { 'Authorization': `Bearer ${token()}` } });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.data?.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setFolderLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/stats', { headers: { 'Authorization': `Bearer ${token()}` } });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchFiles(null);
    fetchStats();
  }, []);

  const handleFileUpload = (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        if (xhr.status >= 200 && xhr.status < 300) {
          fetchFiles(selectedFolderId);
          fetchStats();
        } else {
          alert('Upload failed. Please try again.');
        }
      }, 500);
    };
    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      alert('Upload failed. Please try again.');
    };
    xhr.open('POST', '/api/v1/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`);
    xhr.send(formData);
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` },
      });
      if (response.ok) {
        fetchFiles(selectedFolderId);
        fetchFolders();
        fetchStats();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const response = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (response.ok) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        fetchFolders();
      }
    } catch (error) {
      console.error('Folder creation error:', error);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!window.confirm('Delete this folder? Files inside will not be deleted.')) return;
    try {
      const response = await fetch(`/api/v1/folders/${folderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` },
      });
      if (response.ok) {
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
          fetchFiles(null);
        }
        fetchFolders();
      }
    } catch (error) {
      console.error('Folder deletion error:', error);
    }
  };

  const handleOpenShare = async (fileId: number) => {
    setShareLink('');
    setShareEmail('');
    setShareCopied(false);
    setShareFileId(fileId);
    setShareLoading(true);
    try {
      const response = await fetch(`/api/v1/files/${fileId}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setShareLink(data.share_url || data.data?.shareable_link || '');
      }
    } catch { /* ignore */ }
    setShareLoading(false);
  };

  const handleCopyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleShareByEmail = async () => {
    if (!shareFileId || !shareEmail) return;
    setSendingShare(true);
    try {
      const response = await fetch(`/api/v1/files/${shareFileId}/share-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail }),
      });
      if (response.ok) {
        setShareEmail('');
        alert('File shared via email successfully!');
      } else {
        throw new Error();
      }
    } catch {
      alert('Failed to share via email. Please try again.');
    } finally {
      setSendingShare(false);
    }
  };

  const closeShareModal = () => {
    setShareFileId(null);
    setShareLink('');
    setShareEmail('');
    setShareCopied(false);
  };

  const selectFolder = (folderId: number | null) => {
    setSelectedFolderId(folderId);
    fetchFiles(folderId);
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

  const PreviewModal = () => {
    if (!previewFile) return null;
    const badge = getFileTypeBadge(previewFile.file_type);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPreviewFile(null)}>
        <div className={`relative max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${badge.color} flex items-center justify-center text-sm shrink-0`}>{badge.icon}</span>
              <span className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{previewFile.filename}</span>
            </div>
            <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center justify-center p-4 max-h-[70vh] overflow-auto bg-black/40">
            {previewFile.file_type.startsWith('image/') ? (
              <img src={previewFile.download_url} alt={previewFile.filename} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            ) : previewFile.file_type.includes('pdf') ? (
              <embed src={previewFile.download_url} type="application/pdf" className="w-full h-[65vh] rounded-lg" />
            ) : previewFile.file_type.startsWith('video/') ? (
              <video src={previewFile.download_url} controls className="max-w-full max-h-[65vh] rounded-lg" autoPlay />
            ) : previewFile.file_type.startsWith('audio/') ? (
              <div className="text-center p-8">
                <span className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-4xl mx-auto mb-4`}>{badge.icon}</span>
                <audio src={previewFile.download_url} controls className="w-80" autoPlay />
              </div>
            ) : (
              <div className="text-center p-8">
                <span className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-5xl mx-auto mb-4 shadow-lg`}>{badge.icon}</span>
                <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{previewFile.filename}</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{previewFile.file_type}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800">
            <span className={`text-sm mr-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{formatFileSize(previewFile.file_size)}</span>
            <a href={previewFile.download_url} download={previewFile.filename}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="*/*" />

      {/* Folder Sidebar */}
      <aside className={`w-56 shrink-0 rounded-2xl p-4 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Folders</h2>
          <button onClick={() => { setShowNewFolderInput(true); setNewFolderName(''); }}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
        </div>

        {showNewFolderInput && (
          <div className="mb-3">
            <input
              type="text" placeholder="Folder name" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolderInput(false); }}
              className={`w-full px-3 py-1.5 text-xs rounded-lg border input-focus mb-2 ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`} autoFocus
            />
            <div className="flex gap-1.5">
              <button onClick={handleCreateFolder} className="flex-1 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">Create</button>
              <button onClick={() => setShowNewFolderInput(false)} className={`py-1 px-3 text-xs rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
            </div>
          </div>
        )}

        <button
          onClick={() => selectFolder(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-1 ${
            selectedFolderId === null
              ? 'bg-blue-600 text-white'
              : theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="mr-2">📁</span>All Files
        </button>

        {folderLoading ? (
          <div className="space-y-2 mt-2">
            {[1,2,3].map(i => <div key={i} className={`h-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`} />)}
          </div>
        ) : folders.length === 0 ? (
          <p className={`text-xs mt-4 text-center ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>No folders yet</p>
        ) : (
          <div className="space-y-0.5 mt-1 max-h-[calc(100vh-380px)] overflow-y-auto">
            {folders.map(folder => (
              <div key={folder.id} className="group flex items-center">
                <button
                  onClick={() => selectFolder(folder.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedFolderId === folder.id
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">📂</span>
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-[10px] opacity-60">({folder.file_count})</span>
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600/20 text-red-400 transition-all ml-1"
                  title="Delete folder"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name || 'Folder' : 'My Files'}
            </h1>
          </div>
          <button
            onClick={triggerFileUpload}
            disabled={uploading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {uploading ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{uploadProgress}%</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Upload File</>
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

        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text" placeholder="Search files..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border input-focus ${
                theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={`p-2.5 rounded-xl border transition-all duration-200 ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}>
            {viewMode === 'grid' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
            )}
          </button>
        </div>

        {/* File List */}
        {loading ? (
          <div className={`rounded-2xl p-12 text-center ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <svg className={`w-8 h-8 mx-auto mb-4 animate-spin ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
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
              <button onClick={triggerFileUpload} className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-blue-500/20">
                Upload Your First File
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5' : 'space-y-3'}>
            {filteredFiles.map((file) => {
              const badge = getFileTypeBadge(file.file_type);
              return viewMode === 'grid' ? (
                <div key={file.id} className={`group rounded-2xl p-5 card-hover cursor-pointer ${theme === 'dark' ? 'bg-gray-900 border border-gray-800 hover:border-blue-500/30' : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'}`} onClick={() => setPreviewFile(file)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-xl shadow-lg shrink-0`}>
                      {badge.icon}
                    </div>
                    {file.is_public && (
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>Public</span>
                    )}
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} title={file.filename}>{file.filename}</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>{formatFileSize(file.file_size)}</span>
                    <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>&middot;</span>
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setPreviewFile(file)}
                      className="flex-1 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      Preview
                    </button>
                    <button onClick={() => handleOpenShare(file.id)}
                      className={`py-2 px-3 text-xs font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                      Share
                    </button>
                    <button onClick={() => handleDeleteFile(file.id)}
                      className="py-2 px-3 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div key={file.id} className={`group flex items-center gap-4 rounded-xl px-5 py-4 card-hover cursor-pointer ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`} onClick={() => setPreviewFile(file)}>
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
                  <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setPreviewFile(file)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      Preview
                    </button>
                    <button onClick={() => handleOpenShare(file.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
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

        {/* Share Modal */}
        {shareFileId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8" onClick={closeShareModal}>
            <div className={`rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-xl'}`}
              onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Share File</h3>
              <p className={`text-sm mb-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Share a link or send via email</p>

              {/* Share link */}
              <label className={`text-xs font-medium mb-1.5 block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Shareable Link</label>
              <div className="flex gap-2 mb-4">
                <input type="text" readOnly value={shareLoading ? 'Generating link...' : shareLink}
                  placeholder="Click to generate link"
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm input-focus truncate ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`} />
                {shareLink ? (
                  <button onClick={handleCopyShareLink}
                    className="px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shrink-0">
                    {shareCopied ? 'Copied!' : 'Copy'}
                  </button>
                ) : (
                  <button disabled
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm shrink-0 ${theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>Copy</button>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>OR</span>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </div>

              {/* Email share */}
              <label className={`text-xs font-medium mb-1.5 block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Send via Email</label>
              <input type="email" placeholder="recipient@example.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border input-focus mb-5 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} />
              <div className="flex gap-3">
                <button onClick={closeShareModal}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
                <button onClick={handleShareByEmail} disabled={!shareEmail || sendingShare}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all disabled:opacity-50">
                  {sendingShare ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        <PreviewModal />
      </div>
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
