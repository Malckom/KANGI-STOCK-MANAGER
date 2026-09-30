import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, rowToUser } from './db.js';

// In production, set JWT_SECRET in the environment. Falling back to a
// generated-at-boot secret is fine for a single-process VPS deployment
// (it just means existing sessions expire on restart).
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn(
      'JWT_SECRET is not set — using a random secret generated at startup. ' +
        'Set JWT_SECRET in your environment for stable sessions across restarts.'
    );
    return randomBytes(32).toString('hex');
  })();

const TOKEN_TTL = '12h';

export type UserRole = 'admin' | 'manager' | 'cashier' | 'clerk';

export interface UserRolePermissions {
  canAddProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  canManageCart: boolean;
  canEditSettings: boolean;
  canResetDatabase: boolean;
  canManageProducts: boolean;
  canProcessSales: boolean;
  canRecordPurchases: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canExportExcel: boolean;
}

export function getRolePermissions(role: UserRole): UserRolePermissions {
  switch (role) {
    case 'admin':
      return {
        canAddProduct: true, canEditProduct: true, canDeleteProduct: true, canManageProducts: true,
        canManageCart: true, canProcessSales: true, canRecordPurchases: true, canManageCustomers: true,
        canManageSuppliers: true, canEditSettings: true, canResetDatabase: true, canExportExcel: true,
      };
    case 'manager':
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: true, canRecordPurchases: true, canManageCustomers: true,
        canManageSuppliers: true, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
    case 'cashier':
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: true, canRecordPurchases: false, canManageCustomers: true,
        canManageSuppliers: false, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
    case 'clerk':
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: false, canRecordPurchases: true, canManageCustomers: false,
        canManageSuppliers: true, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
    default:
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: true, canRecordPurchases: false, canManageCustomers: true,
        canManageSuppliers: false, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
  }
}

function signToken(uid: string, role: UserRole) {
  return jwt.sign({ uid, role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function findUserRow(where: string, value: string) {
  return db.prepare(`SELECT * FROM users WHERE ${where} = ? AND isActive = 1`).get(value) as any;
}

export const AuthService = {
  /** Quick 4-digit staff PIN login — the primary till login. */
  loginWithPin(pin: string) {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) throw new AuthError('Please enter your staff PIN code.');
    const row = findUserRow('pin', cleanPin);
    if (!row) throw new AuthError('Invalid PIN code. Please check your 4-digit staff PIN.');
    db.prepare('UPDATE users SET lastLoginAt = ? WHERE uid = ?').run(new Date().toISOString(), row.uid);
    logEvent('LOGIN', row, `PIN verified for ${row.displayName}`);
    const token = signToken(row.uid, row.role);
    return { token, user: rowToUser({ ...row, lastLoginAt: new Date().toISOString() }) };
  },

  /** Email + password login for admin/manager setup access. */
  loginWithEmail(email: string, password: string) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const row = findUserRow('email', cleanEmail);
    if (!row || !row.passwordHash || !bcrypt.compareSync(password, row.passwordHash)) {
      throw new AuthError('Incorrect email or password.');
    }
    db.prepare('UPDATE users SET lastLoginAt = ? WHERE uid = ?').run(new Date().toISOString(), row.uid);
    logEvent('LOGIN', row, `Signed in with email: ${cleanEmail}`);
    const token = signToken(row.uid, row.role);
    return { token, user: rowToUser({ ...row, lastLoginAt: new Date().toISOString() }) };
  },

  /** Registers a new staff member (admin-only route). */
  registerStaff(input: {
    email: string; password: string; displayName: string; role: UserRole;
    phone?: string; pin?: string; storeLocation?: string;
  }) {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = findUserRow('email', cleanEmail);
    if (existing) throw new AuthError('An account with this email address already exists.');
    if (input.pin) {
      const pinTaken = findUserRow('pin', input.pin);
      if (pinTaken) throw new AuthError('That PIN is already in use by another staff member.');
    }
    const uid = `staff-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO users (uid,email,displayName,photoURL,role,phone,pin,passwordHash,storeLocation,isActive,createdAt,lastLoginAt)
      VALUES (@uid,@email,@displayName,NULL,@role,@phone,@pin,@passwordHash,@storeLocation,1,@createdAt,NULL)`).run({
      uid, email: cleanEmail, displayName: input.displayName, role: input.role,
      phone: input.phone || null, pin: input.pin || null,
      passwordHash: bcrypt.hashSync(input.password, 10),
      storeLocation: input.storeLocation || 'Nairobi Main Store',
      createdAt: now,
    });
    const row = findUserRow('uid', uid);
    logEvent('ACCOUNT_CREATED', row, `New staff member registered as ${input.role.toUpperCase()} (${input.displayName})`);
    const token = signToken(uid, input.role);
    return { token, user: rowToUser(row) };
  },

  listStaff() {
    return (db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all() as any[]).map(rowToUser);
  },

  deactivateStaff(uid: string) {
    db.prepare('UPDATE users SET isActive = 0 WHERE uid = ?').run(uid);
  },

  getUserByUid(uid: string) {
    const row = db.prepare('SELECT * FROM users WHERE uid = ?').get(uid) as any;
    return row ? rowToUser(row) : null;
  },

  verifyToken(token: string): { uid: string; role: UserRole } {
    try {
      return jwt.verify(token, JWT_SECRET) as { uid: string; role: UserRole };
    } catch {
      throw new AuthError('Session expired or invalid. Please sign in again.', 401);
    }
  },

  getSessionLogs(limit = 50) {
    return db.prepare('SELECT * FROM session_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  },

  clearSessionLogs() {
    db.prepare('DELETE FROM session_logs').run();
  },
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function logEvent(action: string, user: any, details: string) {
  db.prepare(`INSERT INTO session_logs (id,timestamp,action,userName,userEmail,role,details)
    VALUES (?,?,?,?,?,?,?)`).run(
    `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    new Date().toISOString(),
    action,
    user.displayName,
    user.email,
    user.role,
    details
  );
}

// ===========================================================================
// EXPRESS MIDDLEWARE
// ===========================================================================
export interface AuthedRequest extends Request {
  authUser?: { uid: string; role: UserRole };
}

/** Requires a valid Bearer token; attaches req.authUser. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  try {
    req.authUser = AuthService.verifyToken(token);
    next();
  } catch (err: any) {
    return res.status(err.status || 401).json({ success: false, error: err.message });
  }
}

/** Requires the authenticated user's role to have a given permission. */
export function requirePermission(perm: keyof UserRolePermissions) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const perms = getRolePermissions(req.authUser.role);
    if (!perms[perm]) {
      return res.status(403).json({ success: false, error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}
