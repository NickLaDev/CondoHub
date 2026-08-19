import crypto from 'node:crypto';
import { env } from '../../config/env';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 6;

export const INVITE_CODE_TTL_SECONDS = 10 * 60;

export type InviteCodePayload = {
  code: string;
  codeHash: string;
  codeLast4: string;
  qrValue: string;
};

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Invite code length must be a positive integer');
  }

  let code = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = crypto.randomInt(0, INVITE_CODE_ALPHABET.length);
    code += INVITE_CODE_ALPHABET[randomIndex];
  }

  return code;
}

export function normalizeInviteCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashInviteCode(rawCode: string): string {
  const normalizedCode = normalizeInviteCode(rawCode);

  return crypto
    .createHmac('sha256', env.INVITE_CODE_PEPPER)
    .update(normalizedCode)
    .digest('hex');
}

export function getInviteCodeLast4(rawCode: string): string {
  const normalizedCode = normalizeInviteCode(rawCode);

  if (normalizedCode.length <= 4) {
    return normalizedCode;
  }

  return normalizedCode.slice(-4);
}

export function buildInviteCodeQrValue(instanceKey: string, rawCode: string): string {
  const normalizedCode = normalizeInviteCode(rawCode);

  return `condohub://invite?instanceKey=${encodeURIComponent(instanceKey)}&code=${encodeURIComponent(normalizedCode)}`;
}

export function generateInviteCodePayload(instanceKey: string): InviteCodePayload {
  const code = generateInviteCode();

  return {
    code,
    codeHash: hashInviteCode(code),
    codeLast4: getInviteCodeLast4(code),
    qrValue: buildInviteCodeQrValue(instanceKey, code),
  };
}
