import { Request, Response, NextFunction } from 'express';
import Admin from '../models/Admin';

export interface AuthRequest extends Request {
  admin?: any;
}

export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.session?.adminId;

    if (!adminId) {
      res.status(401).json({ error: 'Access denied. Please login.' });
      return;
    }

    const admin = await Admin.findById(adminId).select('-password');
    if (!admin || !admin.isActive) {
      res.status(401).json({ error: 'Access denied. Invalid admin.' });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.session?.adminId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};