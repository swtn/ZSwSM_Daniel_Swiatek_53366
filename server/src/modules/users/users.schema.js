import { z } from "zod";

const name = z.string().trim()
  .min(1, "Pole nie może być puste.")
  .max(100, "Maksymalna długość to 100 znaków.")
  .refine((value) => !/\p{Cc}/u.test(value), "Pole zawiera niedozwolone znaki.");

export const profileFields = {
  firstName: name,
  lastName: name,
};

export const updateProfileSchema = z.object(profileFields).strict();
