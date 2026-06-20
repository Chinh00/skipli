import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import githubApi from '../services/githubApi';
import { useAuth } from '../context/AuthContext';

const GithubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      githubApi.loginCallback(code)
        .then((response) => {
          login(response.data.accessToken);
          navigate('/');
        })
        .catch((err) => {
          console.error('GitHub login failed', err);
          navigate('/login?error=github_failed');
        });
    } else {
      navigate('/login?error=github_missing_code');
    }
  }, [code, login, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl font-semibold">Signing in with GitHub...</div>
    </div>
  );
};

export default GithubCallback;
