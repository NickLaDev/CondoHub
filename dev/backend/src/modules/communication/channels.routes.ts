import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requirePermission } from "../../middleware/requirePermission";
import { PERMISSIONS } from "../../core/contract/permissions";
import * as h from "./channels.handlers";

const router = Router({ mergeParams: true });
const auth = requireAuth();
const manage = requirePermission(PERMISSIONS.COMMUNICATION_MANAGE);

router.get("/", auth, h.listChannelsHandler);
router.post("/", auth, manage, h.createChannelHandler);
router.patch("/:id", auth, manage, h.updateChannelHandler);
router.post("/:id/archive", auth, manage, h.archiveChannelHandler);

router.get("/:id/posts", auth, h.listPostsHandler);
router.post("/:id/posts", auth, h.createPostHandler);
router.patch("/:id/posts/:postId", auth, h.updatePostHandler);
router.post("/:id/posts/:postId/delete", auth, h.deletePostHandler);

router.get("/:id/posts/:postId/comments", auth, h.listCommentsHandler);
router.post("/:id/posts/:postId/comments", auth, h.createCommentHandler);
router.patch(
  "/:id/posts/:postId/comments/:commentId",
  auth,
  h.updateCommentHandler,
);
router.post(
  "/:id/posts/:postId/comments/:commentId/delete",
  auth,
  h.deleteCommentHandler,
);

router.post("/:id/moderation/silence-user", auth, manage, h.silenceUserHandler);
router.post(
  "/:id/moderation/remove-content",
  auth,
  manage,
  h.removeContentHandler,
);

export default router;
