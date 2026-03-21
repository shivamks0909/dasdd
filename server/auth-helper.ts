import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required for secure authentication.");
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export function generateToken(user: AuthUser): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing during token generation");
  }
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '24h' });
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = req.cookies.get('admin_token')?.value || null;
  }

  if (!token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET!;
    return jwt.verify(token, secret) as any as AuthUser;
  } catch (error) {
    return null;
  }
}

export function authMiddleware(handler: (req: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, user);
  };
}
