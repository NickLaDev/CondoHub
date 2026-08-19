import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermission } from "../../middleware/requirePermission";
import { PERMISSIONS } from "../../core/contract/permissions";
import * as h from "./inbox.handlers";

const router = Router({ mergeParams: true });
const auth = requireAuth();

router.get("/", auth, h.getInboxHandler);
router.post("/messages", auth, h.sendMessageHandler);
router.post(
  "/status",
  auth,
  requirePermission(PERMISSIONS.COMMUNICATION_MANAGE),
  h.updateStatusHandler,
);

export default router;
