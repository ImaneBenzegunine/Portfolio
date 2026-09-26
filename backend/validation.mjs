import { z } from "zod";
const optional = (max) => z.string().trim().max(max).optional().default("");
export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter at least 2 characters.")
      .max(100)
      .refine(
        (s) => !Array.from(s).some((c) => c.charCodeAt(0) < 32),
        "Use a single line.",
      ),
    email: z.string().trim().max(254).email("Enter a valid email address."),
    message: z
      .string()
      .trim()
      .min(20, "Write at least 20 characters.")
      .max(5000),
    phone: optional(40),
    kind: z.enum(["hiring", "collaboration"]),
    projectType: optional(100),
    timeline: optional(100),
    projectLink: optional(500).refine((s) => {
      if (!s) return true;
      try {
        return ["http:", "https:"].includes(new URL(s).protocol);
      } catch {
        return false;
      }
    }, "Use an http or https link."),
    website: z
      .string()
      .max(0, "Please leave this field empty.")
      .optional()
      .default(""),
    startedAt: z.number().finite(),
  })
  .strict();
export function validateContact(body, now = Date.now()) {
  const result = contactSchema.safeParse(body);
  if (!result.success)
    return {
      errors: Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] || "form", i.message]),
      ),
    };
  if (
    now - result.data.startedAt < 2000 ||
    now - result.data.startedAt > 86400000
  )
    return {
      errors: {
        form: "Please take a moment to complete the form, or refresh if it has been open for a day.",
      },
    };
  const { website: _website, startedAt: _startedAt, ...data } = result.data;
  if (data.kind === "hiring") {
    data.projectType = "";
    data.timeline = "";
    data.projectLink = "";
  }
  return { data };
}
