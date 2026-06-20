import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const authMiddleware = (req: authMiddleware.AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

namespace authMiddleware {
  export interface AuthRequest extends Request {
    user?: any;
  }
}

export = authMiddleware;
