import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermission } from "../../middleware/requirePermission";
import { PERMISSIONS } from "../../core/contract/permissions";
import * as h from "./announcements.handlers";

const router = Router({ mergeParams: true });
const auth = requireAuth();
const manage = requirePermission(PERMISSIONS.COMMUNICATION_MANAGE);

router.get("/", auth, h.listAnnouncementsHandler);
router.get("/:id", auth, h.getAnnouncementHandler);
router.post("/", auth, manage, h.createAnnouncementHandler);
router.patch("/:id", auth, manage, h.updateAnnouncementHandler);
router.post("/:id/archive", auth, manage, h.archiveAnnouncementHandler);
router.post("/:id/ack", auth, h.ackAnnouncementHandler);

export default router;
