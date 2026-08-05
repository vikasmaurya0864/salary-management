import { Role, User } from "../../models";
import { comparePassword } from "../../utils/password";
import type { RoleName } from "../../constants/roles";

export interface AuthenticatedUser {
  user: User;
  roleName: RoleName;
}

/**
 * Verifies email/password credentials against the database.
 * Returns `null` on any failure (unknown email, wrong password, or a role
 * that's somehow missing) without distinguishing which — callers should
 * always respond with the same generic "invalid credentials" message to
 * avoid leaking which emails are registered.
 */
export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  const user = await User.findOne({
    where: { email: email.trim().toLowerCase() },
    include: [{ model: Role, as: "role" }],
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  if (!user.role) {
    return null;
  }

  return { user, roleName: user.role.name as RoleName };
}
