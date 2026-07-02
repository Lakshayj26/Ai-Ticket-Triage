import { prisma } from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/mail.js";

/**
 * Creates a new organization.
 * Generates a unique UUID for the organization id (required since the schema does not automatically default it).
 * Sets the creator's role to 'admin' and links them to the new organization.
 */
export const createOrganization = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  const user = await prisma.users.findFirst({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  // Generate a random UUID for the organization since the DB does not generate it by default
  const orgId = crypto.randomUUID();

  const org = await prisma.organization.create({
    data: {
      id: orgId,
      name,
      description,
      created_by: userId,
    },
  });

  if (!org) {
    throw new ApiError(500, "Something went wrong while creating the organization");
  }

  // Set the creator user as the admin of this organization
  await prisma.users.update({
    where: {
      id: userId,
    },
    data: {
      role: "admin",
      organization_id: org.id,
    },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { organization: org },
        "Organization is created successfully."
      )
    );
});

/**
 * Updates organization details.
 * Restricts updates to the admin of the organization.
 */
export const updateOrganization = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  // Fix: orgId is a UUID string in the schema, do not parse it as a Number
  const orgId = req.params.orgId;
  const userId = req.user.id;

  const user = await prisma.users.findFirst({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (user.role !== "admin" || user.organization_id !== orgId) {
    throw new ApiError(401, "Unauthorized access. Admins only.");
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name,
      description,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { organization: org },
        "Organization updated successfully."
      )
    );
});

/**
 * Gets all members of the admin's organization.
 */
export const getOrganizationMembers = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.users.findFirst({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (!user.organization_id) {
    throw new ApiError(400, "You do not belong to an organization");
  }

  const orgId = user.organization_id;
  const list = await prisma.users.findMany({
    where: {
      organization_id: orgId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      skills: true,
      created_at: true,
    }
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { users: list },
        "Users in organization fetched successfully."
      )
    );
});

/*
 * ============================================================================
 * THE CONCEPT OF JWT-BASED INVITATION LINKS:
 * ============================================================================
 * Instead of creating a database table called 'Invitation' to track pending invites,
 * we use JSON Web Tokens (JWTs) to generate a secure, self-contained, and tamper-proof link.
 * 
 * 1. HOW IT WORKS:
 *    - The organization admin inputs the invitee's email.
 *    - The server encodes the organizationId and the invitee's email into a JWT.
 *    - The JWT is signed using a secret key (process.env.ACCESS_TOKEN_SECRET) and
 *      has a limited lifespan (e.g., 2 days) so it expires automatically.
 *    - The server emails a link containing this token to the invitee (e.g., /join-org?token=JWT).
 * 
 * 2. BENEFITS:
 *    - Stateless: No database storage is required to verify the invite's validity.
 *    - Secure: Cryptographic signature ensures the token contents cannot be modified.
 *    - Expiry: Naturally expires and rejects requests after the set expiration time.
 *    - Email-bound: When verifying, we ensure that the logged-in user matches the
 *      invited email, preventing unauthorized people from using the link.
 * ============================================================================
 */

/**
 * Invites a user to the organization by generating a secure JWT-based invite link and emailing it.
 */
export const inviteUserToOrganization = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const userId = req.user.id;

  if (!email) {
    throw new ApiError(400, "Invitee email is required");
  }

  const admin = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!admin || admin.role !== "admin" || !admin.organization_id) {
    throw new ApiError(403, "Only organization admins can invite members");
  }

  const org = await prisma.organization.findUnique({
    where: { id: admin.organization_id },
  });

  // Generate JWT invitation token valid for 2 days
  const token = jwt.sign(
    { organizationId: org.id, email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "2d" }
  );

  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join-org?token=${token}`;

  // Send invitation email
  await sendEmail({
    email,
    subject: `You have been invited to join ${org.name} on AI Ticket Triage`,
    mailgenContent: {
      body: {
        name: "Valued Member",
        intro: `You have been invited to join the organization "${org.name}" as a support triage agent.`,
        action: {
          instruction: "To accept this invitation and join the organization, click the button below:",
          button: {
            color: "#4F46E5",
            text: "Accept Invitation",
            link: inviteUrl,
          },
        },
        outro: "If you did not expect this invitation, you can safely ignore this email.",
      },
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { token, inviteUrl },
      "Invitation email sent successfully."
    )
  );
});

/**
 * Accepts an invitation token, verifies it, and adds the user to the organization.
 */
export const joinOrganizationWithToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    throw new ApiError(400, "Invitation token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invitation link is invalid or has expired");
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.organization_id) {
    throw new ApiError(400, "You are already a member of an organization");
  }

  // Ensure user is accepting their own invitation
  if (user.email.toLowerCase() !== decoded.email.toLowerCase()) {
    throw new ApiError(403, "This invitation was sent to a different email address");
  }

  // Join the organization
  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: {
      organization_id: decoded.organizationId,
      role: "member",
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      organization_id: true,
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: updatedUser },
      "Successfully joined the organization."
    )
  );
});

export const leaveOrganization = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user || !user.organization_id) {
    throw new ApiError(400, "You do not belong to any organization");
  }

  const orgId = user.organization_id;

  if (user.role === "admin") {
    // Find other members in the same organization
    const otherMembers = await prisma.users.findMany({
      where: {
        organization_id: orgId,
        id: { not: userId },
      },
      orderBy: { created_at: "asc" },
    });

    if (otherMembers.length > 0) {
      // Promote the oldest member to admin
      const newAdmin = otherMembers[0];
      await prisma.users.update({
        where: { id: newAdmin.id },
        data: { role: "admin" },
      });

      // Update organization created_by to the new admin
      await prisma.organization.update({
        where: { id: orgId },
        data: { created_by: newAdmin.id },
      });
    } else {
      // No other members, we can safely delete the organization
      // First de-associate user
      await prisma.users.update({
        where: { id: userId },
        data: { organization_id: null, role: "member" },
      });

      // Delete empty organization
      await prisma.organization.delete({
        where: { id: orgId },
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          { role: "member", organization_id: null },
          "Successfully left and deleted organization since you were the last member."
        )
      );
    }
  }

  // Non-admin member, or admin after promoting another member
  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: {
      organization_id: null,
      role: "member",
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      organization_id: true,
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: updatedUser },
      "Successfully left the organization."
    )
  );
});

export const updateOrganizationMember = asyncHandler(async (req, res) => {
  const adminId = req.user.id;
  const { memberId } = req.params;
  const { role, skills, remove } = req.body;

  const targetMemberId = parseInt(memberId, 10);
  if (isNaN(targetMemberId)) {
    throw new ApiError(400, "Invalid member ID format");
  }

  // 1. Verify logged-in user is an admin of their organization
  const adminUser = await prisma.users.findUnique({
    where: { id: adminId },
  });

  if (!adminUser || adminUser.role !== "admin" || !adminUser.organization_id) {
    throw new ApiError(403, "Only organization administrators can manage members");
  }

  const orgId = adminUser.organization_id;

  // 2. Fetch the target member and ensure they are in the same organization
  const targetMember = await prisma.users.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember || targetMember.organization_id !== orgId) {
    throw new ApiError(404, "Member not found in your organization");
  }

  // 3. Prevent admin from managing themselves through this endpoint
  if (targetMember.id === adminId) {
    throw new ApiError(400, "You cannot modify your own roles or membership through this panel");
  }

  // Action A: Remove Member
  if (remove) {
    await prisma.users.update({
      where: { id: targetMemberId },
      data: {
        organization_id: null,
        role: "member",
      },
    });

    return res.status(200).json(
      new ApiResponse(200, null, "Member removed from organization successfully")
    );
  }

  // Action B: Switch Role / Promote
  let roleSwapped = false;
  const updateData = {};

  if (role) {
    if (role === "admin") {
      // Role Swap: Target becomes admin, current admin is demoted to member
      await prisma.users.update({
        where: { id: targetMemberId },
        data: { role: "admin" },
      });

      // Update organization's creator/admin metadata
      await prisma.organization.update({
        where: { id: orgId },
        data: { created_by: targetMemberId },
      });

      // Demote current admin
      await prisma.users.update({
        where: { id: adminId },
        data: { role: "member" },
      });

      roleSwapped = true;
    } else {
      updateData.role = role;
    }
  }

  // Action C: Update Skills
  if (skills && Array.isArray(skills)) {
    updateData.skills = skills;
  }

  // Perform updates if any
  let updatedUser = targetMember;
  if (Object.keys(updateData).length > 0 && !roleSwapped) {
    updatedUser = await prisma.users.update({
      where: { id: targetMemberId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        skills: true,
      },
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: updatedUser, roleSwapped },
      roleSwapped
        ? "Ownership transferred successfully. You are now a standard member."
        : "Member settings updated successfully"
    )
  );
});
