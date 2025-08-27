import { Request, Response } from 'express';
import Admin from '../models/Admin';
import { AuthRequest } from '../middleware/auth';

declare module 'express-session' {
  interface SessionData {
    adminId?: string;
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Set session
    req.session.adminId = (admin._id as string).toString();

    res.json({
      message: 'Login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        res.status(500).json({ error: 'Could not log out' });
        return;
      }
      
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.session?.adminId;
    
    if (!adminId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const admin = await Admin.findById(adminId).select('-password');
    if (!admin || !admin.isActive) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    res.json({
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      res.status(409).json({ error: 'Admin already exists' });
      return;
    }

    const admin = new Admin({ email, password, name });
    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};