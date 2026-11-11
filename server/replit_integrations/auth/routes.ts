import type { Express, Request, Response } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { PublicUser, User } from "@shared/models/auth";
import {
  issueTokenPair, rotateRefreshToken, revokeRefreshToken, wantsTokens, RefreshError,
} from "../../auth/tokens";
import {
  verifyAppleIdentityToken, exchangeAppleAuthorizationCode, appleCredentialsConfigured,
  AppleVerificationError,
} from "../../auth/apple";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });

const appleSchema = z.object({
  identityToken: z.string().min(20),
  authorizationCode: z.string().optional(),
  rawNonce: z.string().min(8),
  // Apple only sends the name on the very first authorization, so the client forwards it.
  givenName: z.string().max(100).nullish(),
  familyName: z.string().max(100).nullish(),
  clientId: z.string().optional(),
});

/** Never send credentials or secrets to the client. */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _p, appleRefreshToken: _a, ...rest } = user;
  return rest;
}

function sessionUserFor(user: User) {
  return {
    claims: {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
    },
    expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
    access_token: null,
    refresh_token: null,
  };
}

/**
 * Web clients get a cookie session (unchanged). The iOS app sends X-Auth-Mode: token and
 * receives a short-lived bearer access token plus a rotating refresh token instead.
 */
async function completeSignIn(req: Request, res: Response, user: User, status = 200) {
  const body: Record<string, unknown> = { ...toPublicUser(user) };
  if (wantsTokens(req)) {
    Object.assign(body, await issueTokenPair(user));
    return res.status(status).json(body);
  }
  req.login(sessionUserFor(user), (err: any) => {
    if (err) {
      console.error("Session creation error:", err?.message);
      return res.status(500).json({ message: "Failed to create session" });
    }
    res.status(status).json(body);
  });
}

export function registerAuthRoutes(app: Express): void {
  // Current authenticated user (sanitized: no password hash or Apple token).
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = await authStorage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      res.json(toPublicUser(user));
    } catch (error) {
      console.error("Error fetching user:", (error as Error)?.message);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);
      const existingUser = await authStorage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await authStorage.createLocalUser({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      await completeSignIn(req, res, user, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", (error as Error)?.message);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);
      const user = await authStorage.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      await completeSignIn(req, res, user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", (error as Error)?.message);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Rotate a refresh token (iOS app). Reuse of an old token revokes the whole token family.
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const pair = await rotateRefreshToken(refreshToken, (id) => authStorage.getUser(id));
      res.json(pair);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof RefreshError) {
        return res.status(401).json({ message: "Session expired. Please sign in again." });
      }
      console.error("Refresh error:", (error as Error)?.message);
      res.status(500).json({ message: "Refresh failed" });
    }
  });

  // Sign in with Apple: verify the identity token against Apple's JWKS, then sign in.
  app.post("/api/auth/apple", async (req, res) => {
    try {
      const input = appleSchema.parse(req.body);
      const identity = await verifyAppleIdentityToken(input.identityToken, { rawNonce: input.rawNonce });
      const user = await authStorage.upsertAppleUser({
        sub: identity.sub,
        email: identity.email,
        emailVerified: identity.emailVerified,
        firstName: input.givenName,
        lastName: input.familyName,
      });
      // Keep Apple's refresh token server-side so account deletion can revoke it (5.1.1(v)).
      if (input.authorizationCode && appleCredentialsConfigured()) {
        try {
          const appleRefresh = await exchangeAppleAuthorizationCode(input.authorizationCode, identity.audience);
          if (appleRefresh) await authStorage.setAppleRefreshToken(user.id, appleRefresh);
        } catch (e) {
          console.warn("Apple code exchange failed:", (e as Error)?.message);
        }
      }
      await completeSignIn(req, res, user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (error instanceof AppleVerificationError || (error as any)?.code?.startsWith?.("ERR_J")) {
        return res.status(401).json({ message: "Sign in with Apple could not be verified." });
      }
      console.error("Apple sign-in error:", (error as Error)?.message);
      res.status(500).json({ message: "Sign in with Apple failed" });
    }
  });

  // Logout: ends the cookie session and, if a refresh token is supplied, revokes its family.
  app.post("/api/auth/logout", async (req, res) => {
    const presented = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null;
    if (presented) {
      try { await revokeRefreshToken(presented); } catch { /* best effort */ }
    }
    if (typeof req.logout === "function") {
      req.logout(() => res.json({ message: "Logged out successfully" }));
    } else {
      res.json({ message: "Logged out successfully" });
    }
  });
}
