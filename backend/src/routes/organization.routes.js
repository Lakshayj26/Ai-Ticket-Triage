import { Router } from "express";
import {
  createOrganization,
  updateOrganization,
  getOrganizationMembers,
  inviteUserToOrganization,
  joinOrganizationWithToken,
  leaveOrganization,
  updateOrganizationMember,
} from "../controllers/organization.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Secure all organization routes with JWT verification
router.use(verifyJWT);

router.post("/", createOrganization);
router.put("/:orgId", updateOrganization);
router.get("/members", getOrganizationMembers);
router.post("/invite", inviteUserToOrganization);
router.post("/join", joinOrganizationWithToken);
router.post("/leave", leaveOrganization);
router.patch("/members/:memberId", updateOrganizationMember);

export default router;
