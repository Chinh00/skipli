import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import { db, admin } from '../config/firebase';
import { githubConfig } from '../config/github';
import { sendVerificationCode } from '../services/mailer';

export const signup = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`\n--- [DEV EMAIL] ---\nTo: ${email}\nCode: ${code}\n-------------------\n`);
  
  if (admin) {
    await db.collection('verifications').doc(email).set({ 
      code, 
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    });
  }
  
  res.status(201).json({ message: 'Verification code sent to email' });
};

export const signin = async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;
  if (!db) {
    return res.status(500).json({ error: 'Database is not initialized. Check your Firebase config.' });
  }
  const doc = await db.collection('verifications').doc(email).get();
  
  if (doc.exists && doc.data()?.code === verificationCode) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    // Cleanup code
    await db.collection('verifications').doc(email).delete();
    // Ensure user exists in users collection
    await db.collection('users').doc(email).set({ email }, { merge: true });
    
    res.json({ accessToken: token });
  } else {
    res.status(401).json({ error: 'Invalid email or verification code' });
  }
};


export const githubAuthUrl = (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: githubConfig.clientId,
    redirect_uri: githubConfig.redirectUri,
    scope: 'read:user user:email repo',
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
};

export const githubCallback = async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  if (!db) {
    return res.status(500).json({ error: 'Database is not initialized. Check your Firebase config.' });
  }

  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: githubConfig.clientId,
      client_secret: githubConfig.clientSecret,
      code,
      redirect_uri: githubConfig.redirectUri,
    }, {
      headers: { Accept: 'application/json' },
    });

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      return res.status(400).json({ error: 'Failed to obtain GitHub access token', details: tokenResponse.data });
    }

    const githubUserResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const githubUser = githubUserResponse.data;
    let email = githubUser.email;

    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const primaryEmail = emailsResponse.data.find((item: any) => item.primary && item.verified);
      email = primaryEmail?.email;
    }

    if (!email) {
      return res.status(400).json({ error: 'GitHub account does not expose a verified email address' });
    }

    await db.collection('users').doc(email).set({
      email,
      githubId: String(githubUser.id),
      githubUsername: githubUser.login,
      githubAvatarUrl: githubUser.avatar_url,
      githubAccessToken: access_token,
      githubConnected: true,
      updatedAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
    }, { merge: true });

    const appToken = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    res.json({
      accessToken: appToken,
      user: {
        email,
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubAvatarUrl: githubUser.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('GitHub login error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to login with GitHub' });
  }
};
