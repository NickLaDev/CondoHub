import { env } from './config/env';
import app from './app';

app.listen(env.PORT, () => {
  console.log(`[CondoHub] Server running on port ${env.PORT}`);
  console.log(`[CondoHub] DATABASE_URL present=${Boolean(env.DATABASE_URL)}`);
  console.log(`[CondoHub] AUTH_MODE=${env.AUTH_MODE} TENANT_MODE=${env.TENANT_MODE}`);
  console.log(`[CondoHub] UPLOAD_MODE=${env.UPLOAD_MODE} AUDIT_MODE=${env.AUDIT_MODE}`);
});
