import { NextFunction, Request, Response } from "express";
import { TICKET_STATUS } from "../../core/contract/enums";
import {
  countByStatus as ticketCountByStatus,
  countOverdue as ticketCountOverdue,
} from "../tickets/tickets.repo";
import { countByStatus as deliveryCountByStatus } from "../deliveries/deliveries.repo";
import { countPendingAcks } from "../communication/announcements.repo";

export async function dashboardSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const iid = req.ctx.instanceId;

    const [
      tAbertos,
      tAnalise,
      tExecucao,
      tAtrasados,
      dPendentes,
      dDistribuicao,
      aPending,
    ] = await Promise.all([
      ticketCountByStatus(iid, TICKET_STATUS.ABERTO),
      ticketCountByStatus(iid, TICKET_STATUS.EM_ANALISE),
      ticketCountByStatus(iid, TICKET_STATUS.EM_EXECUCAO),
      ticketCountOverdue(iid),
      deliveryCountByStatus(iid, "CHEGOU"),
      deliveryCountByStatus(iid, "EM_DISTRIBUICAO"),
      countPendingAcks(iid),
    ]);

    res.json({
      tickets: {
        abertos: tAbertos,
        emAnalise: tAnalise,
        emExecucao: tExecucao,
        atrasados: tAtrasados,
      },
      deliveries: { pendentes: dPendentes, emDistribuicao: dDistribuicao },
      announcements: { pendingAcks: aPending },
    });
  } catch (e) {
    next(e);
  }
}
