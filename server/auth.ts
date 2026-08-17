import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

const PgSession = connectPgSimple(session);

export async function setupAuth(app: Express): Promise<void> {
  app.set("trust proxy", 1);

  // Session middleware — kept for the admin panel which uses req.session.adminAuth.
  // Does not interfere with Clerk JWT-based user auth.
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable must be set.");
  }

  app.use(
    session({
      store: new PgSession({
        // Use the same connection string as the main DB client (server/db.ts)
        conString: process.env.DATABASE_URL,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  // clerkMiddleware reads the Clerk JWT from the Authorization header or
  // __session cookie and populates req.auth on every request.
  // We pass publishableKey explicitly so the backend doesn't need a separate
  // CLERK_PUBLISHABLE_KEY secret — it reuses VITE_CLERK_PUBLISHABLE_KEY.
  app.use(
    clerkMiddleware({
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    }),
  );
}

// requireAuth() enforces that req.auth.userId is present; returns 401 otherwise.
const clerkRequireAuth: RequestHandler = requireAuth() as RequestHandler;

// isAuthenticated = Clerk auth check + suspension gate.
// A suspended user can still reach the sign-in page (unauthenticated routes are
// unaffected) but every authenticated API request returns 403 until an admin
// lifts the suspension.
export const isAuthenticated: RequestHandler = (req, res, next) => {
  clerkRequireAuth(req, res, async (err?: unknown) => {
    if (err) return next(err);
    try {
      const userId = getAuth(req).userId;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user?.isSuspended) {
          return res.status(403).json({ message: "Your account has been suspended" });
        }
      }
      next();
    } catch (e) {
      next(e);
    }
  });
};
