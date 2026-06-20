import './env';

export const githubConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || 'placeholder_client_id',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder_client_secret',
  redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:5173/github/callback'
};

export default githubConfig;
