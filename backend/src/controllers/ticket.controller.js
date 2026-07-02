import { prisma } from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { inngest } from "../inngest/client.js";
import { sendEmail } from "../utils/mail.js";
import analyzeTicket from "../utils/ai.js";
import { findBestModerator } from "../utils/skillMatcher.js";

const processTicketDirectly = async (ticketId) => {
  try {
    // 1. Fetch ticket and organization details
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { users_ticket_created_byTousers: true },
    });

    if (!ticket) return;

    // Check if already processed to prevent double execution
    if (ticket.status !== "todo" && ticket.assigned_to) {
      console.log("Ticket already processed by background task. Skipping direct processing.");
      return;
    }

    const orgId = ticket.users_ticket_created_byTousers?.organization_id;

    // 2. Set status to todo
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "todo" },
    });

    // 3. Analyze ticket content using AI
    console.log(`Analyzing ticket #${ticketId} using fallback direct execution...`);
    const aiResponse = await analyzeTicket(ticket);
    console.log("Direct AI response:", aiResponse);

    let requiredSkills = [];
    if (aiResponse) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          priority: ["low", "medium", "high"].includes(aiResponse.priority)
            ? aiResponse.priority
            : "medium",
          helpful_notes: aiResponse.helpfulNotes,
          status: "in_progress",
          required_skills: aiResponse.relatedSkills || [],
        },
      });
      requiredSkills = aiResponse.relatedSkills || [];
    }

    if (!orgId) {
      console.log("No organization context found. Auto-assignment skipped.");
      return;
    }

    // 4. Find matching agent or fallback to admin
    const user = await findBestModerator(prisma, orgId, requiredSkills);

    if (user) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { assigned_to: user.id },
      });

      // 5. Send assigned notification email
      const finalTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      console.log(`Ticket #${ticketId} successfully assigned to ${user.username}. Sending email...`);

      await sendEmail({
        email: user.email,
        subject: "Ticket Assigned",
        mailgenContent: {
          body: {
            name: user.username || "Team Member",
            intro: `A new ticket "${finalTicket.title}" has been auto-assigned to you based on your skill match.`,
            action: {
              instruction: "To view and manage this ticket, click the button below:",
              button: {
                color: "#4F46E5",
                text: "Review Ticket",
                link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticketId}`,
              },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error(`Error in direct ticket fallback processing:`, err);
  }
};

/**
 * Creates a support ticket.
 * Attaches up to 5 uploaded files if present.
 * Triggers the Inngest background event 'ticket/created' to analyze it with AI and assign to an agent.
 */
export const createTicket = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required.");
  }

  const user = await prisma.users.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.organization_id) {
    throw new ApiError(400, "You must belong to an organization to create a ticket.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create ticket
    const ticket = await tx.ticket.create({
      data: {
        created_by: userId,
        assigned_to: null,
        title,
        description,
      },
    });

    // Save attachments (if any)
    if (req.files?.length > 0) {
      const attachments = req.files.map((file) => ({
        ticket_id: ticket.id,
        uploaded_by: userId,
        file_name: file.originalname,
        file_url: file.path,
        mime_type: file.mimetype,
        file_size: BigInt(file.size),
      }));

      await tx.attachment.createMany({
        data: attachments,
      });
    }

    return ticket;
  });

  // Trigger the background worker flow
  await inngest.send({
    name: "ticket/created",
    data: {
      ticketId: result.id,
      title,
      description,
      organizationId: user.organization_id ? user.organization_id.toString() : null,
      createdBy: req.user.id.toString(), // Fix: req.user uses id, not _id
    },
  }).catch(err => console.log("Inngest send skipped/failed. Fallback direct execution will handle it."));

  // Trigger non-blocking fallback processing directly on the server
  processTicketDirectly(result.id).catch(err => console.error("Direct fallback processing failed:", err));

  return res
    .status(201)
    .json(new ApiResponse(201, result, "Ticket created successfully. AI analysis scheduled."));
});

/**
 * Fetches all tickets in the user's organization.
 * Admins see all tickets. Members see tickets they created or are assigned to.
 */
export const getTickets = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user || !user.organization_id) {
    return res.status(200).json(new ApiResponse(200, [], "No tickets found."));
  }

  let tickets;
  if (user.role === "admin") {
    // Admins see all tickets in the organization
    tickets = await prisma.ticket.findMany({
      where: {
        users_ticket_created_byTousers: {
          organization_id: user.organization_id,
        },
      },
      include: {
        users_ticket_created_byTousers: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        users_ticket_assigned_toTousers: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  } else {
    // Members see tickets created by them OR assigned to them
    tickets = await prisma.ticket.findMany({
      where: {
        users_ticket_created_byTousers: {
          organization_id: user.organization_id,
        },
        OR: [
          { created_by: userId },
          { assigned_to: userId },
        ],
      },
      include: {
        users_ticket_created_byTousers: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        users_ticket_assigned_toTousers: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  // Handle BigInt serialization if present (in ticket attachments, but here we don't fetch attachments to keep payload small)
  return res.status(200).json(new ApiResponse(200, tickets, "Tickets fetched successfully."));
});

/**
 * Fetches a single ticket with its attachments.
 * Validates that the ticket belongs to the user's organization.
 */
export const getTicketById = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const userId = req.user.id;

  if (isNaN(ticketId)) {
    throw new ApiError(400, "Invalid ticket ID");
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      attachment: true,
      users_ticket_created_byTousers: {
        select: {
          id: true,
          username: true,
          email: true,
          organization_id: true,
        },
      },
      users_ticket_assigned_toTousers: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  // Ensure user belongs to the same organization
  if (ticket.users_ticket_created_byTousers.organization_id !== user.organization_id) {
    throw new ApiError(403, "Unauthorized to access this ticket");
  }

  // Convert BigInt file sizes to standard numbers or strings for JSON safety
  if (ticket.attachment) {
    ticket.attachment = ticket.attachment.map((att) => ({
      ...att,
      file_size: att.file_size ? att.file_size.toString() : null,
    }));
  }

  return res.status(200).json(new ApiResponse(200, ticket, "Ticket details fetched successfully."));
});

/**
 * Updates a ticket's status, priority, title, or description.
 * Admin can update everything. Assigned agent or ticket creator can update status/priority.
 */
export const updateTicket = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const { status, priority, description, title } = req.body;
  const userId = req.user.id;

  if (isNaN(ticketId)) {
    throw new ApiError(400, "Invalid ticket ID");
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      users_ticket_created_byTousers: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (ticket.users_ticket_created_byTousers.organization_id !== user.organization_id) {
    throw new ApiError(403, "Unauthorized to update this ticket");
  }

  // Admins can update anything, members can update if they are assigned to it or created it
  if (user.role !== "admin" && ticket.assigned_to !== userId && ticket.created_by !== userId) {
    throw new ApiError(403, "Unauthorized to edit this ticket");
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: status || undefined,
      priority: priority || undefined,
      description: description || undefined,
      title: title || undefined,
      updated_at: new Date(),
    },
  });

  return res.status(200).json(new ApiResponse(200, updatedTicket, "Ticket updated successfully."));
});

/**
 * Manually assigns a ticket to an organization member.
 * Restrained to Organization Admins.
 */
export const assignTicket = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const { assignedTo } = req.body; // User ID to assign to
  const userId = req.user.id;

  if (isNaN(ticketId) || !assignedTo) {
    throw new ApiError(400, "Invalid parameters provided");
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (user.role !== "admin") {
    throw new ApiError(403, "Only admins can manually assign tickets");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      users_ticket_created_byTousers: true,
    },
  });

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (ticket.users_ticket_created_byTousers.organization_id !== user.organization_id) {
    throw new ApiError(403, "Unauthorized access to this ticket");
  }

  // Ensure assignee belongs to the same organization
  const assignee = await prisma.users.findUnique({
    where: { id: Number(assignedTo) },
  });

  if (!assignee || assignee.organization_id !== user.organization_id) {
    throw new ApiError(400, "Assignee does not belong to your organization");
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assigned_to: assignee.id,
      updated_at: new Date(),
    },
  });

  // Send email notification to assignee
  await sendEmail({
    email: assignee.email,
    subject: "Ticket Assigned to You",
    mailgenContent: {
      body: {
        name: assignee.username || "Team Member",
        intro: `Ticket "${ticket.title}" has been assigned to you by the organization administrator.`,
        action: {
          instruction: "Please visit your dashboard to review and start resolving this ticket.",
          button: {
            color: "#4F46E5",
            text: "View Ticket Dashboard",
            link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tickets/${ticketId}`,
          },
        },
      },
    },
  });

  return res.status(200).json(new ApiResponse(200, updatedTicket, "Ticket assigned successfully."));
});
