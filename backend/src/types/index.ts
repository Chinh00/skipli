export interface User {
  email: string;
  githubId?: string;
  githubAccessToken?: string;
  displayName?: string;
  createdAt: any;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: any;
}

export interface Card {
  id: string;
  boardId: string;
  name: string;
  description: string;
  order: number;
  createdAt: any;
}

export interface Task {
  id: string;
  boardId: string;
  cardId: string;
  title: string;
  description: string;
  ownerId: string;
  assigneeId?: string;
  githubAttachments: any[];
  order: number;
  createdAt: any;
}
