import React, { useState } from 'react';
import api from '../services/api';
import githubApi from '../services/githubApi';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Code
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);
  const { login } = useAuth();

  const handleGithubLogin = async () => {
    setError('');
    setMessage('');
    setGithubLoading(true);
    try {
      const response = await githubApi.getLoginUrl();
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start GitHub login');
      setGithubLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/auth/signup', { email });
      setMessage('Verification code sent! Check your terminal.');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/signin', { email, verificationCode: code });
      login(response.data.accessToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Mini Trello Login</h2>
        <p className="text-center text-gray-600 mb-6">Sign in with GitHub or use an email verification code.</p>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{message}</div>}

        <button
          type="button"
          className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={handleGithubLogin}
          disabled={githubLoading}
        >
          {githubLoading ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestCode}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
              <input
                type="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Get Verification Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Verification Code</label>
              <input
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Verify & Login
            </button>
            <button
              type="button"
              className="w-full mt-2 text-blue-500 hover:text-blue-700 text-sm"
              onClick={() => setStep(1)}
            >
              Back to Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
