/**
 * Admin Authentication Middleware
 * Protects monitoring endpoints from unauthorized access
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// Admin credentials — must be set as environment secrets (no hardcoded fallbacks)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment secrets must be set.');
}

// Session-based admin authentication
interface AdminSession {
  isAuthenticated: boolean;
  loginTime: number;
  username: string;
}

// Extend Express Request type to include admin session
declare global {
  namespace Express {
    interface Request {
      adminSession?: AdminSession;
    }
  }
}

/**
 * Hash password securely
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'salt_surf_monitor').digest('hex');
}

/**
 * Verify admin credentials
 */
function verifyAdminCredentials(username: string, password: string): boolean {
  // Simple but secure verification for single admin system
  const usernameMatch = username === ADMIN_USERNAME;
  const passwordHash = hashPassword(password);
  const expectedHash = hashPassword(ADMIN_PASSWORD);
  const passwordMatch = passwordHash === expectedHash;
  
  return usernameMatch && passwordMatch;
}

/**
 * Admin login endpoint
 */
export async function adminLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password required' 
      });
    }
    
    if (verifyAdminCredentials(username, password)) {
      // Store admin session
      req.session.adminAuth = {
        isAuthenticated: true,
        loginTime: Date.now(),
        username: username
      };
      
      console.log(`Admin login successful for user: ${username}`);
      
      res.json({ 
        success: true, 
        message: 'Authentication successful (session valid for 7 days)',
        redirectUrl: '/monitoring'
      });
    } else {
      // Add delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.warn(`Failed admin login attempt for user: ${username}`);
      
      res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Login system error' 
    });
  }
}

/**
 * Admin logout endpoint
 */
export function adminLogout(req: Request, res: Response) {
  req.session.adminAuth = undefined;
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
}

/**
 * Check admin authentication status
 */
export function adminStatus(req: Request, res: Response) {
  const adminAuth = req.session.adminAuth as AdminSession | undefined;
  
  if (adminAuth?.isAuthenticated) {
    // Check if session is still valid (7 days)
    const sessionAge = Date.now() - adminAuth.loginTime;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (sessionAge < maxAge) {
      res.json({
        authenticated: true,
        username: adminAuth.username,
        loginTime: adminAuth.loginTime
      });
    } else {
      // Session expired
      req.session.adminAuth = undefined;
      res.json({ authenticated: false });
    }
  } else {
    res.json({ authenticated: false });
  }
}

/**
 * Middleware to protect admin routes
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const adminAuth = req.session.adminAuth as AdminSession | undefined;
  
  if (!adminAuth?.isAuthenticated) {
    return res.status(401).json({ 
      error: 'Admin authentication required',
      loginUrl: '/admin/login'
    });
  }
  
  // Check session expiry
  const sessionAge = Date.now() - adminAuth.loginTime;
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  if (sessionAge >= maxAge) {
    req.session.adminAuth = undefined;
    return res.status(401).json({ 
      error: 'Session expired, please login again',
      loginUrl: '/admin/login'
    });
  }
  
  // Add admin info to request
  req.adminSession = adminAuth;
  next();
}

/**
 * Middleware for development environment bypass
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // In development, you can bypass auth (optional)
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    console.warn('⚠️  Admin authentication bypassed in development mode');
    req.adminSession = {
      isAuthenticated: true,
      loginTime: Date.now(),
      username: 'dev-admin'
    };
    return next();
  }
  
  requireAdminAuth(req, res, next);
}