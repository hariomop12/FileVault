import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/ui/DarkModeToggle';

import { authService } from '../services/auth';
import { RegisterCredentials } from '../types';

// Form validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Register: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterCredentials>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      
      if (response.success) {
        toast.success('Registration successful! Please check your email to verify your account.');
        navigate('/login');
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-green-50 via-emerald-100 to-teal-50'
    }`}>
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle />
      </div>
      
      <div className={`max-w-md w-full space-y-8 relative z-0 p-8 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-slate-800/50 border border-slate-700/50 shadow-2xl shadow-purple-500/20'
          : 'bg-white/80 border border-white/20 shadow-2xl shadow-emerald-500/20'
      }`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            🎆 Create your FileVault account
          </h2>
          <p className={`mt-2 text-center text-sm transition-colors duration-300 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Or{' '}
            <Link
              to="/login"
              className={`font-medium transition-colors duration-300 ${
                theme === 'dark'
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-blue-600 hover:text-blue-500'
              }`}
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className={`block text-sm font-medium transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                👤 Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-700/50 placeholder-gray-400 text-white focus:ring-emerald-500 focus:border-emerald-500'
                    : 'border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className={`mt-1 text-sm transition-colors duration-300 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className={`block text-sm font-medium transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                📧 Email address
              </label>
              <input
                {...register('email')}
                type="email"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-700/50 placeholder-gray-400 text-white focus:ring-emerald-500 focus:border-emerald-500'
                    : 'border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className={`mt-1 text-sm transition-colors duration-300 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className={`block text-sm font-medium transition-colors duration-300 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                🔑 Password
              </label>
              <input
                {...register('password')}
                type="password"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-700/50 placeholder-gray-400 text-white focus:ring-emerald-500 focus:border-emerald-500'
                    : 'border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className={`mt-1 text-sm transition-colors duration-300 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:ring-emerald-500 shadow-lg shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:ring-blue-500 shadow-lg shadow-blue-500/25'
              }`}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;