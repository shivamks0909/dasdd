import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, Response, NextFunction } from "express";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    adminId?: number;
  }
}

export function setupAuth(app: Express) {
  // Trust the Vercel reverse proxy for HTTPS termination
  app.set('trust proxy', 1);

  const sessionStore = process.env.DATABASE_URL
    ? new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      // Suppress advisory lock issues if using Supabase transaction pooler on Vercel
      pruneSessionInterval: false,
    })
    : undefined;

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "opinion-insights-secret-key-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // Must be true in Vercel production
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
