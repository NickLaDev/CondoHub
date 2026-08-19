import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermission } from "../../middleware/requirePermission";
import { PERMISSIONS } from "../../core/contract/permissions";
import * as h from "./deliveries.handlers";

const auth = requireAuth();
const deliver = requirePermission(PERMISSIONS.DELIVERIES_DELIVER);
const manage = requirePermission(PERMISSIONS.DELIVERIES_MANAGE);

const deliveryRouter = Router({ mergeParams: true });
deliveryRouter.post("/", auth, manage, h.createDeliveryHandler);
deliveryRouter.get("/", auth, h.listDeliveriesHandler);
deliveryRouter.get("/queue", auth, deliver, h.queueHandler);
deliveryRouter.get("/:id", auth, h.getDeliveryHandler);
deliveryRouter.post("/:id/assign", auth, manage, h.assignDeliveryHandler);
deliveryRouter.post("/:id/complete", auth, deliver, h.completeDeliveryHandler);
deliveryRouter.post("/:id/fail", auth, h.failDeliveryHandler);

const turnRouter = Router({ mergeParams: true });
turnRouter.post("/start", auth, deliver, h.startTurnHandler);
turnRouter.post("/end", auth, deliver, h.endTurnHandler);

export { deliveryRouter, turnRouter };
