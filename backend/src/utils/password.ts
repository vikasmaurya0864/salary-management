import bcrypt from "bcrypt";

// 12 rounds is a reasonable balance of security vs. hashing latency in 2026;
// bump this over time as hardware gets faster.
const SALT_ROUNDS = 12;

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export function comparePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}
