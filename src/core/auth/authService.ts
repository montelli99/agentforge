import * as crypto from "node:crypto";
import { AgentForgeUser, UserRole } from "../types/identity.js";

/**
 * Role-Based Access Control (RBAC) Permission Definitions
 * Section 11: Identity + RBAC
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ["*"],
  admin: [
    "tasks:*",
    "agents:*",
    "processes:*",
    "approvals:*",
    "workforce:*",
    "marketplace:*",
    "memory:*",
    "audit:read",
    "settings:read",
    "settings:write",
    "users:read",
    "users:create",
  ],
  engineer: [
    "tasks:*",
    "agents:read",
    "processes:*",
    "approvals:read",
    "workforce:read",
    "marketplace:read",
    "memory:*",
    "audit:read",
  ],
  operator: [
    "tasks:read",
    "tasks:create",
    "tasks:execute",
    "approvals:read",
    "approvals:create",
    "agents:read",
    "processes:read",
    "workforce:read",
    "marketplace:read",
    "memory:read",
    "audit:read",
  ],
  viewer: [
    "tasks:read",
    "agents:read",
    "processes:read",
    "approvals:read",
    "workforce:read",
    "marketplace:read",
    "memory:read",
    "audit:read",
  ],
};

export interface AuthSession {
  token: string;
  userId: string;
  role: UserRole;
  permissions: string[];
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  userId: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

export interface UserCredentials {
  salt: string;
  passwordHash: string;
}

/**
 * Password Security using PBKDF2 (100,000 iterations, sha256)
 */
export function hashPassword(password: string, existingSalt?: string): UserCredentials {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
  return { salt, passwordHash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const { passwordHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(passwordHash, "hex"), Buffer.from(expectedHash, "hex"));
}

/**
 * Generates a cryptographically strong 256-bit session token
 */
export function generateSessionToken(): string {
  return `af_sess_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Generates an API key (e.g. af_key_...) and returns the raw key and its hash
 */
export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const secret = crypto.randomBytes(24).toString("hex");
  const keyPrefix = secret.slice(0, 8);
  const rawKey = `af_key_${secret}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Checks whether a given set of permissions satisfies a required permission.
 * Supports exact match, global wildcard (*), and domain wildcard (e.g. tasks:*).
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes("*")) {
    return true;
  }
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  const [domain] = requiredPermission.split(":");
  if (domain && userPermissions.includes(`${domain}:*`)) {
    return true;
  }
  return false;
}
