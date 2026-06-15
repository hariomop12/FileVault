import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import DarkModeToggle from "../components/ui/DarkModeToggle";
import { authService } from "../services/auth";

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
}

const Login: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const response: LoginResponse = await authService.login({ email, password });

      if (response?.success && response?.token) {
        localStorage.setItem("auth_token", response.token);
        if (response.user) localStorage.setItem("user", JSON.stringify(response.user));
        navigate("/dashboard");
      } else {
        setError(response?.message || "Invalid email or password");
      }
    } catch (err: any) {
      let errorMessage = "Login failed. Please try again.";
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
        if (errorMessage.includes("Invalid credentials") || errorMessage.includes("User not found"))
          errorMessage += " - Try registering first if you do not have an account.";
        if (errorMessage.includes("Email not verified"))
          errorMessage += " - Please verify your email before logging in.";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
      theme === "dark"
        ? "bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950"
        : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
    }`}>
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle />
      </div>

      <div className={`max-w-md w-full animate-fade-in space-y-8 relative z-0 p-8 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
        theme === "dark"
          ? "bg-gray-900/80 border border-gray-800 shadow-2xl"
          : "bg-white/80 border border-gray-200 shadow-xl"
      }`}>
        <div className="text-center">
          <div className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg mb-4`}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Sign in to FileVault
          </h2>
          <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            Or{" "}
            <Link to="/register" className={`font-medium ${theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}>
              create a new account
            </Link>
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
              theme === "dark" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
            }`}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className={`block text-sm font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Email address
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 rounded-xl border input-focus ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
              }`}
            />
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Password
            </label>
            <input
              id="password" name="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`w-full px-4 py-2.5 rounded-xl border input-focus ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
              theme === "dark"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
