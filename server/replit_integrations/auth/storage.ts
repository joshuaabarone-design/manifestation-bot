import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(userData: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<User>;
  getUserByAppleSub(sub: string): Promise<User | undefined>;
  upsertAppleUser(data: { sub: string; email?: string; emailVerified: boolean; firstName?: string | null; lastName?: string | null }): Promise<User>;
  setAppleRefreshToken(userId: string, token: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        authProvider: "local",
      })
      .returning();
    return user;
  }

  async getUserByAppleSub(sub: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleSub, sub));
    return user;
  }

  /** Find by Apple subject; else link to an existing account with the same verified email; else create. */
  async upsertAppleUser(data: { sub: string; email?: string; emailVerified: boolean; firstName?: string | null; lastName?: string | null }): Promise<User> {
    const bySub = await this.getUserByAppleSub(data.sub);
    if (bySub) return bySub;
    if (data.email && data.emailVerified) {
      const byEmail = await this.getUserByEmail(data.email);
      if (byEmail) {
        const [linked] = await db.update(users)
          .set({ appleSub: data.sub, updatedAt: new Date() })
          .where(eq(users.id, byEmail.id)).returning();
        return linked;
      }
    }
    const [created] = await db.insert(users).values({
      email: data.email ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      appleSub: data.sub,
      authProvider: "apple",
    }).returning();
    return created;
  }

  async setAppleRefreshToken(userId: string, token: string): Promise<void> {
    await db.update(users).set({ appleRefreshToken: token, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const authStorage = new AuthStorage();
