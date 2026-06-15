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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const Register: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
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
        if ((response as any).verificationToken) {
          toast.success(`Dev mode: Check console for verification link!`, { duration: 10000 });
        }
        setRegisteredEmail(data.email);
        setShowVerificationPrompt(true);
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.error === 'User already exists' || errorData?.message?.includes('already exists')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(errorData?.message || errorData?.error || 'An error occurred during registration');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950'
        : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50'
    }`}>
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle />
      </div>

      <div className={`max-w-md w-full animate-fade-in space-y-8 relative z-0 p-8 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-gray-900/80 border border-gray-800 shadow-2xl'
          : 'bg-white/80 border border-gray-200 shadow-xl'
      }`}>
        {showVerificationPrompt ? (
          <div className="text-center animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Check Your Email
            </h2>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              We've sent a verification link to <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{registeredEmail}</strong>.
            </p>
            <div className={`mb-6 p-4 rounded-xl text-sm border ${
              theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <strong>Development Mode:</strong> Check the browser console for the verification link.
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
              >
                Continue to Login
              </button>
              <button
                onClick={() => setShowVerificationPrompt(false)}
                className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Back to Registration
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg mb-4">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Create your account
              </h2>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Or{" "}
                <Link to="/login" className={`font-medium ${theme === 'dark' ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-600 hover:text-blue-500'}`}>
                  sign in to your existing account
                </Link>
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="name" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Name
                </label>
                <input
                  {...register('name')}
                  id="name" name="name" type="text" autoComplete="name" required
                  placeholder="John Doe"
                  className={`w-full px-4 py-2.5 rounded-xl border input-focus ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                {errors.name && <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email address
                </label>
                <input
                  {...register('email')}
                  id="email" name="email" type="email" autoComplete="email" required
                  placeholder="you@example.com"
                  className={`w-full px-4 py-2.5 rounded-xl border input-focus ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                {errors.email && <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  {...register('password')}
                  id="password" name="password" type="password" autoComplete="new-password" required
                  placeholder="Min 8 characters"
                  className={`w-full px-4 py-2.5 rounded-xl border input-focus ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                {errors.password && <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : "Create account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
