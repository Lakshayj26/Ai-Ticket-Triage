import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  assignTicket,
} from "../controllers/ticket.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Secure all ticket routes
router.use(verifyJWT);

// Create a new support ticket (handles up to 5 file attachments)
router.post(
  "/create-ticket",
  upload.array("attachments", 5),
  createTicket
);

// List tickets in user's organization
router.get("/", getTickets);

// Get specific ticket details by ticket ID
router.get("/:ticketId", getTicketById);

// Update status, priority, or description of a ticket
router.patch("/:ticketId", updateTicket);

// Manually assign a ticket to an agent (admin only)
router.patch("/:ticketId/assign", assignTicket);

export default router;
