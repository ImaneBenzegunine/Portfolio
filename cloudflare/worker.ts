import { deliverOne } from "./delivery.ts";
import type { DeliveryEnv } from "./types.ts";

export default {
  async scheduled(_controller: ScheduledController, env: DeliveryEnv) {
    try {
      await deliverOne(env);
    } catch {
      console.error(
        "Contact queue maintenance failed; inspect D1 and Worker health.",
      );
      throw new Error("Contact queue maintenance failed");
    }
  },
} satisfies ExportedHandler<DeliveryEnv>;
