import nodemailer from "nodemailer";
import type { DeliveryEnv, OwnerEmail } from "./types.ts";

export function gmailTransport(env: DeliveryEnv) {
  if (!env.SMTP_USER || !env.SMTP_PASS)
    throw new Error("Gmail is not configured");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export async function withGmail(
  env: DeliveryEnv,
  run: (ready: DeliveryEnv) => Promise<void>,
) {
  const transport = gmailTransport(env);
  try {
    // Refresh the public form heartbeat only after authentication succeeds.
    await transport.verify();
    await run({
      ...env,
      SMTP_SEND: async (message: OwnerEmail) => {
        const result = await transport.sendMail({
          ...message,
          messageId: `<${message.headers["X-Portfolio-Inquiry-ID"]}@imanebenzegunine.pages.dev>`,
        });
        if (!result.accepted?.includes(message.to))
          throw new Error("Recipient not accepted");
      },
    });
  } finally {
    transport.close();
  }
}
