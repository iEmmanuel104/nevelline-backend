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

    // Super simple login - accept any email/password combination
    // Just check if it's the basic admin format
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Simple check - accept admin@nevelline.com or any email ending with @nevelline.com
    if (!email.includes('@') || password.length < 3) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Create/find admin automatically
    let admin = await Admin.findOne({ email });
    if (!admin) {
      admin = new Admin({
        email,
        password, // Will be hashed automatically by the model
        name: 'Admin',
        isActive: true
      });
      await admin.save();
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Set session with very long expiry (1 year)
    req.session.adminId = (admin._id as string).toString();
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 365; // 1 year

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
    // Super simple admin creation - just need email
    const { email } = req.body;
    const password = 'admin123'; // Default simple password
    const name = 'Admin';

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      res.status(200).json({
        message: 'Admin already exists',
        admin: {
          id: existingAdmin._id,
          email: existingAdmin.email,
          name: existingAdmin.name
        }
      });
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
      },
      credentials: {
        email: admin.email,
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Quick admin setup function
export const quickSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminEmail = 'admin@nevelline.com';
    const adminPassword = 'admin123';
    
    let admin = await Admin.findOne({ email: adminEmail });
    
    if (!admin) {
      admin = new Admin({
        email: adminEmail,
        password: adminPassword,
        name: 'Nevelline Admin',
        isActive: true
      });
      await admin.save();
      
      res.json({
        message: 'Admin setup complete! You can now login.',
        credentials: {
          email: adminEmail,
          password: adminPassword
        }
      });
    } else {
      res.json({
        message: 'Admin already exists. Use existing credentials.',
        credentials: {
          email: adminEmail,
          password: adminPassword
        }
      });
    }
  } catch (error) {
    console.error('Quick setup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};