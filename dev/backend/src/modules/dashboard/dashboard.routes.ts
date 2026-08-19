import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermission } from "../../middleware/requirePermission";
import { PERMISSIONS } from "../../core/contract/permissions";
import { dashboardSummaryHandler } from "./dashboard.handlers";

const router = Router({ mergeParams: true });

router.get(
  "/summary",
  requireAuth(),
  requirePermission(PERMISSIONS.COMMUNICATION_MANAGE),
  dashboardSummaryHandler,
);

export default router;
