import { inngest } from "../client-instance.js";
import { NonRetriableError } from "inngest";
import { sendEmail } from "../../utils/mail.js";
import analyzeTicket from "../../utils/ai.js";
import { prisma } from "../../database/db.js";
import { findBestModerator } from "../../utils/skillMatcher.js";

export const onTicketCreated = inngest.createFunction(
  {
    id: "on-ticket-created",
    retries: 2,
    triggers: { event: "ticket/created" },
  },
  async ({ event, step }) => {
    const { ticketId } = event.data;
    try {
      // 1. Fetch ticket from DB along with the creator to resolve the organization context
      const { ticket, orgId } = await step.run("fetch-ticket", async () => {
        const ticketObject = await prisma.ticket.findUnique({
          where: {
            id: ticketId,
          },
          include: {
            users_ticket_created_byTousers: true,
          },
        });
        if (!ticketObject) {
          throw new NonRetriableError("Ticket not found");
        }
        return {
          ticket: ticketObject,
          orgId: ticketObject.users_ticket_created_byTousers?.organization_id,
        };
      });

      // 2. Update ticket status to todo
      await step.run("update-ticket-status", async () => {
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },
          data: {
            status: "todo",
          },
        });
      });

      // 3. Use AI to analyze the ticket
      const aiResponse = await analyzeTicket(ticket);
      console.log("AI analysis response:", aiResponse);

      const requiredSkills = await step.run("ai-processing", async () => {
        let skills = [];
        if (aiResponse) {
          await prisma.ticket.update({
            where: {
              id: ticketId,
            },
            data: {
              priority: ["low", "medium", "high"].includes(aiResponse.priority)
                ? aiResponse.priority
                : "medium",
              helpful_notes: aiResponse.helpfulNotes,
              status: "in_progress",
              required_skills: aiResponse.relatedSkills || [],
            },
          });
          skills = aiResponse.relatedSkills || [];

          const updated = await prisma.ticket.findUnique({
            where: { id: ticketId }
          });
          console.log("Updated Ticket after AI processing:", updated);
        }
        return skills;
      });

      console.log("Moderator assignment process starting for orgId:", orgId);

      // 4. Assign moderator based on skills, or fallback to Admin
      const moderator = await step.run("assign-moderator", async () => {
        if (!orgId) {
          console.log("No organization ID found for ticket creator. Cannot auto-assign.");
          return null;
        }

        // Find the best moderator using the fuzzy skill matcher
        const user = await findBestModerator(prisma, orgId, requiredSkills);

        console.log("Moderator selected for assignment:", user);

        if (user) {
          await prisma.ticket.update({
            where: {
              id: ticketId,
            },
            data: {
              assigned_to: user.id,
            },
          });
        }

        return user;
      });

      console.log("Moderator assignment process finished.");

      // 5. Send email notification to the assigned moderator
      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalTicket = await prisma.ticket.findUnique({
            where: {
              id: ticketId,
            }
          });

          await sendEmail({
            email: moderator.email,
            subject: "Ticket Assigned",
            mailgenContent: {
              body: {
                name: moderator.username || "Team Member",
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
      });

      return { success: true };
    } catch (error) {
      console.log("❌ Error running step:", error.message);
      return { success: false, error: error.message };
    }
  }
);
