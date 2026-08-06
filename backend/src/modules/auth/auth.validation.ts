import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const mobileRegex = /^\+?[0-9]{7,15}$/;

// Public self-registration always becomes an EMPLOYEE — there is no `role`
// field here at all, so a caller can't request anything else. Admin/HR
// creating HR/Employee accounts on someone else's behalf goes through
// `POST /api/users` instead (see `user.validation.ts`).
export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").max(100),
  mobile: z.string().trim().regex(mobileRegex, "Invalid mobile number"),
  address: z.string().trim().max(500).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "refreshToken is required"),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
