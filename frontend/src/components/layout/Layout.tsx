import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Navigation */}
      <nav className={`shadow transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-800 border-b border-slate-700' 
          : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                  theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'
                }`}>FileVault</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className={`border-transparent whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:border-cyan-400'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/files"
                  className={`border-transparent whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:border-cyan-400'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Files
                </Link>
                <Link
                  to="/settings"
                  className={`border-transparent whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:border-cyan-400'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className={`mr-4 transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Hello, {user.name || 'Demo User'}</span>
              <button
                onClick={handleLogout}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;