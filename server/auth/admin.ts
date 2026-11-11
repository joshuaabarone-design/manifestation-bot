// Admin gate for operator-only features (Training dashboard, AgentForge agent/training routes).
// users.is_admin defaults to false and is never writable through the API.
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/models/auth";

export async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const [row] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  return row?.isAdmin === true;
}

/** Use after isAuthenticated. Non-admins get 404 so the routes are not advertised to consumers. */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as any)?.claims?.sub as string | undefined;
    if (!(await isAdminUser(userId))) {
      return res.status(404).json({ message: "Not found" });
    }
    next();
  } catch (err) {
    next(err);
  }
};
