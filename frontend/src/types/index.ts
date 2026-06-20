export interface User {
  email: string;
  githubId?: string;
  githubAccessToken?: string;
  displayName?: string;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: string;
}

export interface Card {
  id: string;
  boardId: string;
  name: string;
  description: string;
  order: number;
  createdAt: string;
}

export interface Task {
  id: string;
  boardId: string;
  cardId: string;
  title: string;
  description: string;
  ownerId: string;
  assigneeId?: string;
  githubAttachments: GithubAttachment[];
  order: number;
  createdAt: string;
}

export interface GithubAttachment {
  id: string;
  type: 'repo' | 'issue' | 'pull_request';
  data: any;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string;
  html_url: string;
}
