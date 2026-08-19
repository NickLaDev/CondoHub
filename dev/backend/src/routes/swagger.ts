import { Router, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';

const swaggerPath = path.resolve(
  process.cwd(),
  'docs/openapi/condohub.openapi.json',
);

const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

const swaggerRouter = Router();

// helmet sets strict CSP by default — disable it for swagger UI assets
function relaxCsp(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader('Content-Security-Policy');
  next();
}

swaggerRouter.use('/api/docs', relaxCsp, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default swaggerRouter;








