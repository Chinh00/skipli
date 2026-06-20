import { Response } from 'express';
import axios from 'axios';
import { db } from '../config/firebase';
import { githubConfig } from '../config/github';
import authMiddleware from '../middleware/auth';

export const getAuthUrl = (req: authMiddleware.AuthRequest, res: Response) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${githubConfig.clientId}&redirect_uri=${githubConfig.redirectUri}&scope=repo,user`;
  res.json({ url });
};

export const callback = async (req: authMiddleware.AuthRequest, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: githubConfig.clientId,
      client_secret: githubConfig.clientSecret,
      code,
      redirect_uri: githubConfig.redirectUri
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = response.data;
    if (!access_token) {
      return res.status(400).json({ error: 'Failed to obtain access token', details: response.data });
    }

    // Store token in user profile
    await db.collection('users').doc(req.user.email).update({
      githubAccessToken: access_token,
      githubConnected: true
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('GitHub callback error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to connect GitHub' });
  }
};

export const getRepos = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.email).get();
    const userData = userDoc.data();
    const token = userData?.githubAccessToken;

    if (!token) return res.status(401).json({ error: 'GitHub not connected' });

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${token}` }
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('GitHub getRepos error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
};

export const getRepoDetails = async (req: authMiddleware.AuthRequest, res: Response) => {
  const { owner, repo } = req.params;
  try {
    const userDoc = await db.collection('users').doc(req.user.email).get();
    const userData = userDoc.data();
    const token = userData?.githubAccessToken;

    if (!token) return res.status(401).json({ error: 'GitHub not connected' });

    const headers = { Authorization: `token ${token}` };

    const [branches, pulls, issues] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, { headers })
    ]);

    res.json({
      branches: branches.data,
      pulls: pulls.data,
      issues: issues.data.filter((issue: any) => !issue.pull_request) // Issues only
    });
  } catch (error: any) {
    console.error('GitHub getRepoDetails error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch repository details' });
  }
};

export const attachEntity = async (req: authMiddleware.AuthRequest, res: Response) => {
  const boardId = req.params.boardId as string;
  const cardId = req.params.cardId as string;
  const taskId = req.params.taskId as string;
  const { type, entity } = req.body; // type: 'repo', 'branch', 'pull', 'issue'

  try {
    const taskRef = db.collection('boards').doc(boardId)
      .collection('cards').doc(cardId)
      .collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });

    const taskData = taskDoc.data();
    const githubAttachments = taskData?.githubAttachments || [];
    githubAttachments.push({ type, ...entity, attachedAt: new Date() });

    await taskRef.update({ githubAttachments });

    res.json({ success: true, githubAttachments });
  } catch (error) {
    console.error('GitHub attachEntity error:', error);
    res.status(500).json({ error: 'Failed to attach GitHub entity' });
  }
};

export const detachEntity = async (req: authMiddleware.AuthRequest, res: Response) => {
  const boardId = req.params.boardId as string;
  const cardId = req.params.cardId as string;
  const taskId = req.params.taskId as string;
  const { entityId } = req.body;

  try {
    const taskRef = db.collection('boards').doc(boardId)
      .collection('cards').doc(cardId)
      .collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });

    const taskData = taskDoc.data();
    let githubAttachments = taskData?.githubAttachments || [];
    githubAttachments = githubAttachments.filter((a: any) => a.id !== entityId && a.url !== entityId);

    await taskRef.update({ githubAttachments });

    res.json({ success: true, githubAttachments });
  } catch (error) {
    console.error('GitHub detachEntity error:', error);
    res.status(500).json({ error: 'Failed to detach GitHub entity' });
  }
};
