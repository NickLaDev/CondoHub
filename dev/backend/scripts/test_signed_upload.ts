/**
 * Script de validação do fluxo completo de upload via Supabase Storage.
 *
 * Uso:
 *   npx tsx scripts/test_signed_upload.ts
 *
 * Requer no .env (ou nas env vars):
 *   UPLOAD_MODE=supabase
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
 *   SUPABASE_STORAGE_BUCKET=attachments
 *
 * O servidor deve estar rodando em PORT (default 3000).
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Carrega .env ──────────────────────────────────────────────────────────────
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;
const INSTANCE_KEY = 'test';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

// Headers mock para o backend
const MOCK_HEADERS = {
  'Content-Type': 'application/json',
  'X-Dev-InstanceId': 'inst_test_001',
  'X-Dev-UserId': 'user_script',
  'X-Dev-Roles': 'SINDICO_ADMIN',
};

// Arquivo de teste (1x1 px PNG transparente)
const TEST_FILE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const TEST_FILENAME = 'test_pixel.png';
const TEST_CONTENT_TYPE = 'image/png';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiPost(endpoint: string, body: unknown) {
  const url = `${BASE_URL}/api/v1/${INSTANCE_KEY}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: MOCK_HEADERS,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${endpoint} falhou (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

// ── Fluxo principal ───────────────────────────────────────────────────────────
async function main() {
  console.log('🚀  Iniciando teste de upload via Supabase Storage\n');

  // Passo 1: /presign
  console.log('1️⃣   POST /uploads/presign ...');
  const presign = await apiPost('/uploads/presign', {
    filename: TEST_FILENAME,
    contentType: TEST_CONTENT_TYPE,
    size: TEST_FILE_BUFFER.length,
  });
  console.log('   ✅  presign OK:', JSON.stringify(presign, null, 4));

  const { attachmentId, bucket, path: storagePath, token } = presign;

  if (!token || !storagePath || !bucket) {
    throw new Error('Resposta do presign incompleta — faltam token/path/bucket');
  }

  // Passo 2: uploadToSignedUrl via supabase-js
  console.log('\n2️⃣   uploadToSignedUrl ...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(storagePath, token, TEST_FILE_BUFFER, {
      contentType: TEST_CONTENT_TYPE,
    });

  if (uploadError) {
    throw new Error(`uploadToSignedUrl falhou: ${uploadError.message}`);
  }
  console.log('   ✅  upload OK:', JSON.stringify(uploadData, null, 4));

  // Passo 3: /complete
  console.log('\n3️⃣   POST /uploads/complete ...');
  const complete = await apiPost('/uploads/complete', {
    attachmentId,
    bucket,
    path: storagePath,
    contentType: TEST_CONTENT_TYPE,
    sizeBytes: TEST_FILE_BUFFER.length,
  });
  console.log('   ✅  complete OK:', JSON.stringify(complete, null, 4));

  console.log('\n🎉  Fluxo completo com sucesso!');
}

main().catch((err) => {
  console.error('\n❌  Erro:', err.message);
  process.exit(1);
});
