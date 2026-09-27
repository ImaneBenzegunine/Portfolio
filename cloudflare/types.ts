export interface ContactEnv {
  CONTACT_DB: D1Database;
  CONTACT_ENABLED?: string;
  PUBLIC_ORIGIN?: string;
  RETENTION_DAYS?: string;
  RATE_LIMIT_SALT?: string;
}

export interface Inquiry {
  id: string;
  payload: string;
  created: number;
  expires_at: number;
  status: "pending" | "sending" | "failed";
  attempts: number;
  next_attempt: number;
  lease_until: number;
  lease_token: string;
  last_error: string | null;
}

// The structured send_email API accepts a text body and a dedicated Reply-To.
export interface OwnerEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  headers: Record<string, string>;
}

export interface DeliveryEnv {
  CONTACT_DB: D1Database;
  EMAIL: Pick<SendEmail, "send">;
  DELIVERY_ENABLED?: string;
  MAIL_FROM?: string;
  MAIL_TO?: string;
}
