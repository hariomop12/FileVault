import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/ui/DarkModeToggle';
import { authService } from '../services/auth';

const Login: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simple validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      // Use the auth service for login
      const response = await authService.login({ email, password });
      console.log('✅ Login successful:', response);
      
      if (response.success && response.token) {
        // Store the real JWT token and user data
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user || { name: 'User', email }));
        navigate('/dashboard');
      } else {
        setError(response.message || 'Login failed: No token received');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-50'
    }`}>
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle />
      </div>
      
      <div className={`max-w-md w-full space-y-8 relative z-0 p-8 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-slate-800/50 border border-slate-700/50 shadow-2xl shadow-purple-500/20'
          : 'bg-white/80 border border-white/20 shadow-2xl shadow-blue-500/20'
      }`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            🔐 Sign in to FileVault
          </h2>
          <p className={`mt-2 text-center text-sm transition-colors duration-300 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Or{' '}
            <Link
              to="/register"
              className={`font-medium transition-colors duration-300 ${
                theme === 'dark'
                  ? 'text-cyan-400 hover:text-cyan-300'
                  : 'text-blue-600 hover:text-blue-500'
              }`}
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`border px-4 py-3 rounded-lg transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-red-900/50 border-red-700/50 text-red-300'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                📧 Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-700/50 placeholder-gray-400 text-white focus:ring-cyan-500 focus:border-cyan-500'
                    : 'border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className={`block text-sm font-medium transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                🔑 Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-700/50 placeholder-gray-400 text-white focus:ring-cyan-500 focus:border-cyan-500'
                    : 'border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 focus:ring-cyan-500 shadow-lg shadow-cyan-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:ring-blue-500 shadow-lg shadow-blue-500/25'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;