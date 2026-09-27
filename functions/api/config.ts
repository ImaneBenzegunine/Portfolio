import { config } from "../../cloudflare/contact.ts";
import type { ContactEnv } from "../../cloudflare/types.ts";

export const onRequest: PagesFunction<ContactEnv> = ({ request, env }) =>
  config(request, env);
