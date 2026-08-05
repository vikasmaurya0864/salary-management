import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50)
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(255).optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .transform((value) => value.toUpperCase())
      .optional(),
    description: z.string().trim().max(255).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
