import api from './api';
import { GithubRepo, Task } from '../types';

const githubApi = {
  getAuthUrl: () => api.get<{ url: string }>('/github/auth-url'),
  callback: (code: string) => api.post<{ user: any, accessToken: string }>('/github/callback', { code }),
  getLoginUrl: () => api.get<{ url: string }>('/auth/github/url'),
  loginCallback: (code: string) => api.post<{ user: any, accessToken: string }>('/auth/github/callback', { code }),
  getRepos: () => api.get<GithubRepo[]>('/github/repos'),
  getRepoDetails: (owner: string, repo: string) => api.get<GithubRepo>(`/github/repos/${owner}/${repo}`),
  attachEntity: (boardId: string, cardId: string, taskId: string, type: string, entity: any) => 
    api.post<Task>(`/github/boards/${boardId}/cards/${cardId}/tasks/${taskId}/attach`, { type, entity }),
  detachEntity: (boardId: string, cardId: string, taskId: string, entityId: string) => 
    api.post<Task>(`/github/boards/${boardId}/cards/${cardId}/tasks/${taskId}/detach`, { entityId }),
};

export default githubApi;
