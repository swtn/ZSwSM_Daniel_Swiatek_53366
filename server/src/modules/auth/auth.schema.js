import { z } from "zod";

export const registerSchema = z.object({
    email: z.string().trim().toLowerCase().max(254).email(),
    password: z.string().min(12).max(128),
}).strict();

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().max(254).email(),
    password: z.string().min(1).max(128),
}).strict();