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
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤 Uploading file:', file.name);
      
      // Call your FileVault API
      const response = await fetch('http://localhost:3000/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 API Response:', data);
        
        if (data.success) {
          // Your backend wraps the response in a 'data' object
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
            console.error('❌ Missing file_id or secret_key in response:', data);
            alert('❌ Upload succeeded but missing credentials in response. Check console for details.');
          }
        } else {
          console.error('❌ Upload failed:', data);
          alert('❌ ' + (data.message || 'Upload failed'));
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Upload request failed:', response.status, errorText);
        throw new Error(`Upload request failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('❌ Upload failed. Please check the console for details and ensure your backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDownload = async () => {
    if (downloadId && downloadKey) {
      try {
        setIsDownloading(true);
        
        // Call your FileVault API - replace with actual API endpoint
        const response = await fetch('http://localhost:3000/api/v1/files/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: downloadId,
            secret_key: downloadKey,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📥 Download API Response:', data);
          
          // Backend returns: { message: "...", data: { url: "...", file_name: "..." } }
          if (data.data && data.data.url) {
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = data.data.url;
            link.download = data.data.file_name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success message
            alert('✅ Download started successfully!');
          } else {
            console.error('❌ Unexpected response structure:', data);
            alert('❌ ' + (data.message || 'Download failed. Please check your credentials.'));
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Download request failed:', response.status, errorData);
          alert('❌ ' + (errorData.error || errorData.message || `Download failed with status ${response.status}`));
        }
      } catch (error) {
        console.error('❌ Download error:', error);
        alert('❌ Download failed. Please check your file ID and secret key, and ensure the backend is running.');
      } finally {
        setIsDownloading(false);
      }
    } else {
      alert('⚠️ Please enter both File ID and Secret Key');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🔐 FileVault
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Secure Cloud File Storage
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Made Simple
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Upload, store, and share your files securely with enterprise-grade encryption. 
              No registration required for anonymous uploads.
            </p>
          </div>

          {/* Anonymous Upload/Download Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                📤 Anonymous Upload
              </h3>
              
              {!uploadResult ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <div className="space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 dark:text-gray-300">Uploading...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-6xl">📁</div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                          Drag & drop your file here
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          or click to browse
                        </p>
                      </div>
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <h4 className="text-green-800 dark:text-green-300 font-semibold mb-4">
                    ✅ Upload Successful!
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>File ID:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{uploadResult.file_id}</code></p>
                    <p><strong>Secret Key:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{uploadResult.secret_key}</code></p>
                    <p className="text-green-700 dark:text-green-400 text-xs mt-3">
                      💡 Save these credentials to download your file later!
                    </p>
                  </div>
                  <button
                    onClick={() => {setUploadResult(null);}}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Upload Another File
                  </button>
                </div>
              )}
            </div>

            {/* Download Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                📥 Download File
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File ID
                  </label>
                  <input
                    type="text"
                    value={downloadId}
                    onChange={(e) => setDownloadId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter file ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secret Key
                  </label>
                  <input
                    type="text"
                    value={downloadKey}
                    onChange={(e) => setDownloadKey(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter secret key"
                  />
                </div>
                
                <button
                  onClick={handleDownload}
                  disabled={!downloadId || !downloadKey || isDownloading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    'Download File'
                  )}
                </button>
                
                <p className="text-gray-500 dark:text-gray-400 text-xs text-center">
                  🔒 Files are encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose FileVault?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Enterprise-grade security meets user-friendly design
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                End-to-End Encryption
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your files are encrypted before upload and decrypted only when you download them.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">☁️</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Cloudflare R2 Storage
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Lightning-fast global CDN with zero egress fees and 99.9% uptime.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Anonymous Uploads
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No registration required. Upload files instantly and share them securely.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                File Management
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create an account to organize, share, and manage your files with ease.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Lightning Fast
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Upload and download files at blazing speeds with our optimized infrastructure.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Shareable Links
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate secure, time-limited links to share files with anyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Secure Your Files?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who trust FileVault with their important files.
          </p>
          <div className="space-x-4">
            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="inline-block px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 FileVault. Built with ❤️ for secure file storage.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;