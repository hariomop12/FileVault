import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DarkModeToggle from '../components/ui/DarkModeToggle';

const LandingPage: React.FC = () => {
  const [downloadId, setDownloadId] = useState('');
  const [downloadKey, setDownloadKey] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3000/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const responseData = data.data || data;
          const fileId = responseData.file_id || responseData.fileId || responseData.id;
          const secretKey = responseData.secret_key || responseData.secretKey || responseData.key;
          const downloadUrl = responseData.url || responseData.download_url || responseData.downloadUrl;

          if (fileId && secretKey) {
            setUploadResult({
              file_id: fileId,
              secret_key: secretKey,
              filename: file.name,
              download_url: downloadUrl
            });
          } else {
            alert('Upload succeeded but missing credentials in response.');
          }
        } else {
          alert(data.message || 'Upload failed');
        }
      } else {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please ensure the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDownload = async () => {
    if (!downloadId || !downloadKey) {
      alert('Please enter both File ID and Secret Key');
      return;
    }
    try {
      setIsDownloading(true);
      const response = await fetch('http://localhost:3000/api/v1/files/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: downloadId, secret_key: downloadKey }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.url) {
          const link = document.createElement('a');
          link.href = data.data.url;
          link.download = data.data.file_name || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert(data.message || 'Download failed. Check your credentials.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(errorData.error || errorData.message || 'Download failed');
      }
    } catch (error) {
      alert('Download failed. Please check your credentials and ensure the backend is running.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text">FileVault</span>
            </Link>

            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-7xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-sm text-blue-600 dark:text-blue-400 font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Enterprise-grade file security
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            Secure Cloud
            <br />
            <span className="gradient-text">File Storage</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Upload, store, and share your files securely with enterprise-grade encryption.
            No registration required for anonymous uploads.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5">
              Start Free
            </Link>
            <a href="#features" className="px-8 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:-translate-y-0.5">
              Learn More
            </a>
          </div>
        </div>

        {/* Upload/Download Cards */}
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-blue-500/5 border border-gray-200 dark:border-gray-800 p-8 card-hover">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Anonymous Upload</h3>
            </div>

            {!uploadResult ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
              >
                {isUploading ? (
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 animate-spin mx-auto" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Uploading...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">Drop file here</p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">or click to browse</p>
                    </div>
                    <input type="file" onChange={handleFileSelect} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Choose File
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-6 animate-scale-in">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-300 font-semibold">Upload Successful!</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-20 shrink-0">File ID:</span>
                    <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200 font-mono text-xs truncate">{uploadResult.file_id}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-20 shrink-0">Secret Key:</span>
                    <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200 font-mono text-xs truncate">{uploadResult.secret_key}</code>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-3 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Save these credentials to download your file later!
                  </p>
                </div>
                <button onClick={() => setUploadResult(null)} className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all duration-200">
                  Upload Another
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-blue-500/5 border border-gray-200 dark:border-gray-800 p-8 card-hover">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M3 16.5h18M3 16.5V6a3 3 0 013-3h12a3 3 0 013 3v10.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Download File</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File ID</label>
                <input
                  type="text"
                  value={downloadId}
                  onChange={(e) => setDownloadId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 input-focus"
                  placeholder="Enter file ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Secret Key</label>
                <input
                  type="text"
                  value={downloadKey}
                  onChange={(e) => setDownloadKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 input-focus"
                  placeholder="Enter secret key"
                />
              </div>
              <button
                onClick={handleDownload}
                disabled={!downloadId || !downloadKey || isDownloading}
                className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download File
                  </>
                )}
              </button>
              <p className="text-gray-400 dark:text-gray-600 text-xs text-center flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Encrypted & secure
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4">
              Why FileVault?
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              Enterprise-grade security,{' '}
              <span className="gradient-text">zero complexity</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need for secure file storage and sharing
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🔒', title: 'End-to-End Encryption', desc: 'Your files are encrypted before upload and decrypted only when you download them.' },
              { icon: '☁️', title: 'Cloudflare R2 Storage', desc: 'Lightning-fast global CDN with zero egress fees and 99.9% uptime.' },
              { icon: '👤', title: 'Anonymous Uploads', desc: 'No registration required. Upload instantly and share securely.' },
              { icon: '📊', title: 'Smart File Management', desc: 'Organize, preview, and manage your files with an intuitive dashboard.' },
              { icon: '🚀', title: 'Lightning Fast', desc: 'Blazing speeds with optimized infrastructure and global CDN.' },
              { icon: '🔗', title: 'Shareable Links', desc: 'Generate secure, time-limited links to share files with anyone.' },
            ].map((feature, i) => (
              <div key={i} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 card-hover animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { value: '10K+', label: 'Files Uploaded' },
              { value: '99.9%', label: 'Uptime' },
              { value: '256-bit', label: 'Encryption' },
            ].map((stat, i) => (
              <div key={i} className="text-center animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="text-4xl md:text-5xl font-extrabold gradient-text mb-2">{stat.value}</div>
                <div className="text-gray-500 dark:text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Ready to Secure Your Files?
          </h2>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of users who trust FileVault with their important files.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 text-base font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-xl shadow-xl transition-all duration-200 hover:-translate-y-0.5">
              Get Started Free
            </Link>
            <Link to="/login" className="px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-200 hover:-translate-y-0.5">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-semibold text-white">FileVault</span>
          </div>
          <p className="text-sm text-gray-500">&copy; 2025 FileVault. Built with security at its core.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
