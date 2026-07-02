import { inngest } from "./client-instance.js";
import { onTicketCreated } from "./functions/on-ticket-created.js";

// Re-export the client and export the registered functions
export { inngest };
export const functions = [onTicketCreated];
