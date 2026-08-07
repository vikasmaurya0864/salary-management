/**
 * Safe user payload for API responses. Works for both live Sequelize
 * instances and plain objects revived from Redis cache (which have no
 * `.toJSON()` method). Always strips `password`.
 */
export function presentUser(user: { toJSON?: () => unknown } | Record<string, unknown>): Record<string, unknown> {
  if (user && typeof user.toJSON === "function") {
    return user.toJSON() as Record<string, unknown>;
  }

  const plain = { ...(user as Record<string, unknown>) };
  delete plain.password;
  return plain;
}
