import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Settings: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
        <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className={`rounded-2xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Profile</h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Display Name</label>
              <input
                type="text"
                defaultValue="User"
                className={`w-full max-w-md px-4 py-2.5 rounded-xl border input-focus ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                defaultValue="user@example.com"
                disabled
                className={`w-full max-w-md px-4 py-2.5 rounded-xl border opacity-60 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              />
            </div>
            <button className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-blue-500/20">
              Save Changes
            </button>
          </div>
        </div>

        {/* Theme Section */}
        <div className={`rounded-2xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Appearance</h2>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Use the toggle in the navigation bar to switch between light and dark mode.
          </p>
          <div className={`flex items-center gap-3 p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-600'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Current: <span className="capitalize">{theme}</span> mode
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                Automatically saved to your browser
              </p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`rounded-2xl p-6 border ${theme === 'dark' ? 'bg-gray-900 border-red-900/30' : 'bg-white border-red-200'}`}>
          <h2 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Danger Zone</h2>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Irreversible actions. Proceed with caution.
          </p>
          <button className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-500 transition-all duration-200">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
