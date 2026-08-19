import { Router } from "express";
import announcementRoutes from "./announcements.routes";
import channelRoutes from "./channels.routes";
import inboxRoutes from "./inbox.routes";

const router = Router({ mergeParams: true });

router.use("/announcements", announcementRoutes);
router.use("/channels", channelRoutes);
router.use("/unit/inbox", inboxRoutes);

export default router;
