import { RequestContext } from '../../contract/requestContext';

export interface PresignInput {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignOutput {
  attachmentId: string;
  /** URL para upload (= signedUrl no modo Supabase, path local no modo local) */
  uploadUrl: string;
  /** Apenas modo Supabase: URL assinada para PUT do cliente */
  signedUrl?: string;
  /** Apenas modo Supabase: token para usar em uploadToSignedUrl() */
  token?: string;
  /** Apenas modo Supabase: nome do bucket */
  bucket?: string;
  /** Apenas modo Supabase: path do objeto no storage */
  path?: string;
  /** Apenas modo local: URL pública do arquivo */
  publicUrl?: string;
}

export interface CompleteInput {
  attachmentId: string;
  /** Obrigatório no modo Supabase */
  bucket?: string;
  /** Obrigatório no modo Supabase */
  path?: string;
  /** Opcional: consistência com metadata do presign */
  contentType?: string;
  /** Opcional: consistência com metadata do presign */
  sizeBytes?: number;
  /** Opcional: hash calculado pelo cliente */
  checksumSha256?: string;
}

export interface CompleteOutput {
  ok: true;
  attachmentId: string;
  /** Apenas modo local */
  publicUrl?: string;
  /** Apenas modo Supabase */
  bucket?: string;
  /** Apenas modo Supabase */
  path?: string;
}

export interface SignedDownloadUrlOutput {
  url: string;
  expiresAt: string;
}

export interface UploadService {
  presign(ctx: RequestContext, input: PresignInput): Promise<PresignOutput>;
  complete(ctx: RequestContext, input: CompleteInput): Promise<CompleteOutput>;
  getSignedDownloadUrl(ctx: RequestContext, attachmentId: string): Promise<SignedDownloadUrlOutput>;
}
