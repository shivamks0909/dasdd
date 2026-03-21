import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    supplierUserId?: string;
  }
}
import { pool } from "./db";

export function setupAuth(app: Express) {
  // Trust the Vercel reverse proxy for HTTPS termination
  app.set('trust proxy', 1);

  console.log("setupAuth: process.env.DATABASE_URL is", process.env.DATABASE_URL ? "defined" : "undefined");

  let sessionStore: any = undefined; // undefined = express-session MemoryStore (dev only)
  const dbUrl = process.env.DATABASE_URL;
  const isRealDb = dbUrl && !dbUrl.includes("placeholder") && !dbUrl.includes("localhost:5432");
  try {
    if (isRealDb) {
      console.log("setupAuth: Creating PgSession store...");
      sessionStore = new PgSession({
        pool,
        createTableIfMissing: true,
        tableName: 'session',
        pruneSessionInterval: false,
        errorLog: console.error
      });
    } else {
      console.warn("setupAuth: No real DATABASE_URL. Using MemoryStore (dev mode).");
    }
  } catch (err) {
    console.error("setupAuth: Error creating session store, falling back to MemoryStore:", err);
    sessionStore = undefined;
  }

  app.use(
    session({
      store: sessionStore,
      secret: (() => {
        if (!process.env.SESSION_SECRET) {
          throw new Error("SESSION_SECRET environment variable is required for secure sessions.");
        }
        return process.env.SESSION_SECRET;
      })(),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session.adminId) {
    return next();
  }

  // Fallback to JWT (check cookie or header)
  const token = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (decoded.role === "admin") {
        req.session.adminId = decoded.id; // Sync back to session for subsequent calls
        return next();
      }
    } catch (err) {
      // Invalid token, fall through to 401
    }
  }

  return res.status(401).json({ message: "Unauthorized as Admin" });
}

export function requireSupplier(req: Request, res: Response, next: NextFunction) {
  if (req.session.supplierUserId) {
    return next();
  }

  // Fallback to JWT
  const token = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      // Admin token should also allow supplier access generally, 
      // but let's check for specifically allowed roles if needed.
      if (decoded.role === "admin" || decoded.role === "supplier") {
        if (decoded.role === "supplier") {
          req.session.supplierUserId = decoded.id;
        }
        return next();
      }
    } catch (err) {
      // Invalid
    }
  }

  return res.status(401).json({ message: "Unauthorized as Supplier" });
}
