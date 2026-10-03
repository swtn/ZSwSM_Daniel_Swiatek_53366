import { z } from "zod";

export const depositSchema = z.object({
  amount: z.string()
    .regex(
      /^(0|[1-9]\d{0,16})\.\d{2}$/,
      "Kwota musi mieć format np. 100.00, z maksymalnie 17 cyframi przed kropką."
    )
    .refine(
      (amount) => amount !== "0.00",
      "Kwota wpłaty musi być większa od zera."
    ),
}).strict();