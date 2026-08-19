import { RequestContext } from '../core/contract/requestContext';

declare global {
  namespace Express {
    interface Request {
      id: string;
      ctx: RequestContext;
    }
  }
}
