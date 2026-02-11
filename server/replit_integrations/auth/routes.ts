import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Local registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await authStorage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user
      const user = await authStorage.createLocalUser({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      // Create session - format must match what passport.serializeUser expects
      // Using same structure as Replit auth for compatibility
      const sessionUser = {
        claims: { 
          sub: user.id, 
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
        access_token: null, // Local auth doesn't use these
        refresh_token: null,
      };
      
      req.login(sessionUser, (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.status(201).json({ 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Local login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);

      // Find user by email
      const user = await authStorage.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session - format must match what passport.serializeUser expects
      const sessionUser = {
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
      
      req.login(sessionUser, (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({ 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Local logout endpoint (separate from Replit auth logout)
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
}
