import { deliverOne } from "./delivery.ts";
import { withGmail } from "./gmail.ts";
import type { DeliveryEnv } from "./types.ts";

export default {
  async scheduled(_controller: ScheduledController, env: DeliveryEnv) {
    try {
      if (env.DELIVERY_ENABLED === "true") {
        await withGmail(env, (ready) => deliverOne(ready));
      } else {
        await deliverOne(env);
      }
    } catch {
      await env.CONTACT_DB.prepare(
        "UPDATE worker_state SET last_tick=0 WHERE id=1",
      ).run();
      console.error("Gmail connection or contact queue unavailable.");
      throw new Error("Gmail connection or contact queue unavailable");
    }
  },
} satisfies ExportedHandler<DeliveryEnv>;
