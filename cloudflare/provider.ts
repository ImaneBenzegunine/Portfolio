import { contactSchema } from "../backend/validation.mjs";
import type { DeliveryEnv, Inquiry } from "./types.ts";

// Conservative rolling window avoids depending on the provider's billing timezone.
// Include failed/ambiguous attempts: they might have reached the provider.
export const FREE_WINDOW = 31 * 86400000;
export const FREE_ATTEMPTS = 50;
export const providerName = (env: { DELIVERY_PROVIDER?: string }) =>
  env.DELIVERY_PROVIDER || "formcarry";
export const formIdValid = (id?: string) =>
  !!id && /^[a-zA-Z0-9_-]{5,128}$/.test(id);

export function deliveryConfigured(env: DeliveryEnv) {
  if (env.DELIVERY_ENABLED !== "true") return false;
  if (providerName(env) === "formcarry")
    return formIdValid(env.FORMCARRY_FORM_ID);
  return (
    providerName(env) === "cloudflare" &&
    !!env.EMAIL &&
    contactSchema.shape.email.safeParse(env.MAIL_FROM).success &&
    contactSchema.shape.email.safeParse(env.MAIL_TO).success
  );
}

export class ProviderError extends Error {
  readonly permanent: boolean;
  readonly pauseMs: number;
  constructor(permanent: boolean, pauseMs: number) {
    super("Form provider did not confirm acceptance");
    this.permanent = permanent;
    this.pauseMs = pauseMs;
  }
}

export async function sendFormcarry(
  row: Inquiry,
  env: DeliveryEnv,
  fetcher = fetch,
) {
  if (!formIdValid(env.FORMCARRY_FORM_ID))
    throw new ProviderError(true, FREE_WINDOW);
  const data = JSON.parse(row.payload);
  // Fixed provider host, no configurable URL or user-controlled recipients/options.
  const response = await fetcher(
    `https://formcarry.com/s/${env.FORMCARRY_FORM_ID}`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message,
        phone: data.phone,
        kind: data.kind,
        projectType: data.projectType,
        timeline: data.timeline,
        projectLink: data.projectLink,
        inquiryId: row.id,
        _gotcha: "",
      }),
    },
  );
  // The documented API can report failure in JSON even if HTTP succeeded.
  const body = (await response.json()) as { code?: number };
  if (response.ok && body.code === 200) return;
  // No documented idempotency or reliable rejection-before-storage signal.
  // Even quota failures may have been stored. Require manual reconciliation.
  throw new ProviderError(true, FREE_WINDOW);
}
