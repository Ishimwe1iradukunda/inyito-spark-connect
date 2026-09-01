import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255, "Email is too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hints: string[];
};

export function scorePassword(password: string): PasswordStrength {
  const hints: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else hints.push("At least 8 characters");

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else hints.push("Mix upper and lowercase");

  if (/[0-9]/.test(password)) score++;
  else hints.push("Add a number");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else hints.push("Add a symbol for extra strength");

  if (password.length >= 14 && score === 4) score = 4;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: score as PasswordStrength["score"], label: labels[score], hints };
}
