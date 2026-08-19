import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermission } from "../../middleware/requirePermission";
import { PERMISSIONS } from "../../core/contract/permissions";
import * as h from "./tickets.handlers";

const router = Router({ mergeParams: true });
const auth = requireAuth();

router.post(
  "/",
  auth,
  requirePermission(PERMISSIONS.TICKETS_CREATE),
  h.createTicketHandler,
);
router.get("/", auth, h.listTicketsHandler);
router.get("/:id", auth, h.getTicketHandler);
router.post("/:id/messages", auth, h.addMessageHandler);
router.post(
  "/:id/assign",
  auth,
  requirePermission(PERMISSIONS.TICKETS_UPDATE),
  h.assignTicketHandler,
);
router.post(
  "/:id/status",
  auth,
  h.changeStatusHandler,
);
router.post("/:id/reopen", auth, h.reopenTicketHandler);

export default router;
