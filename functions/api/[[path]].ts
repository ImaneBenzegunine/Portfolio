import { json } from "../../cloudflare/http.ts";

export const onRequest: PagesFunction = () =>
  json({ message: "Not found." }, 404);
