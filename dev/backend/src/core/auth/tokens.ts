import crypto from 'node:crypto';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError, Errors } from '../contract/errors';
import { AccessTokenClaims, AccessTokenPayload } from '../../modules/auth/auth.types';

export const ACCESS_TTL_SECONDS = 5 * 60;
export const REFRESH_TTL_DAYS = 30;
export const INVITE_SIGNUP_TTL_SECONDS = 10 * 60;
export const INSTANCE_SELECTION_TTL_SECONDS = 5 * 60;

export type InviteSignupTokenPayload = {
  instanceId: string;
  inviteId: string;
  unitId: string;
  purpose: 'invite_signup';
};

export type InviteSignupTokenClaims = InviteSignupTokenPayload & {
  iat: number;
  exp: number;
};

export type InstanceSelectionAllowedAccount = {
  userId: string;
  instanceId: string;
};

export type InstanceSelectionTokenPayload = {
  purpose: 'instance_selection';
  email: string;
  allowed: InstanceSelectionAllowedAccount[];
};

export type InstanceSelectionTokenClaims = InstanceSelectionTokenPayload & {
  iat: number;
  exp: number;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAllowedSelectionArray(value: unknown): value is InstanceSelectionAllowedAccount[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        isUuid((item as Record<string, unknown>).userId) &&
        isUuid((item as Record<string, unknown>).instanceId),
    )
  );
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

export function signInviteSignupToken(payload: InviteSignupTokenPayload, expiresInSec = INVITE_SIGNUP_TTL_SECONDS): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: expiresInSec,
  });
}

export function signInstanceSelectionToken(
  payload: InstanceSelectionTokenPayload,
  expiresInSec = INSTANCE_SELECTION_TTL_SECONDS,
): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: expiresInSec,
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function verifyInviteSignupToken(token: string): InviteSignupTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    const instanceId = decoded.instanceId;
    const inviteId = decoded.inviteId;
    const unitId = decoded.unitId;
    const purpose = decoded.purpose;
    const iat = decoded.iat;
    const exp = decoded.exp;

    if (!isUuid(instanceId) || !isUuid(inviteId) || !isUuid(unitId)) {
      throw new AppError(400, 'INVALID_SIGNUP_TOKEN', 'Signup token is invalid');
    }

    if (purpose !== 'invite_signup') {
      throw new AppError(400, 'INVALID_SIGNUP_TOKEN', 'Signup token is invalid');
    }

    if (typeof iat !== 'number' || typeof exp !== 'number') {
      throw new AppError(400, 'INVALID_SIGNUP_TOKEN', 'Signup token is invalid');
    }

    return {
      instanceId,
      inviteId,
      unitId,
      purpose: 'invite_signup',
      iat,
      exp,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof TokenExpiredError) {
      throw new AppError(400, 'SIGNUP_TOKEN_EXPIRED', 'Signup token has expired');
    }

    throw new AppError(400, 'INVALID_SIGNUP_TOKEN', 'Signup token is invalid');
  }
}

export function verifyInstanceSelectionToken(token: string): InstanceSelectionTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    const purpose = decoded.purpose;
    const email = decoded.email;
    const allowed = decoded.allowed;
    const iat = decoded.iat;
    const exp = decoded.exp;

    if (purpose !== 'instance_selection') {
      throw new AppError(401, 'INVALID_SELECTION_TOKEN', 'Selection token is invalid');
    }

    if (typeof email !== 'string' || !email.trim()) {
      throw new AppError(401, 'INVALID_SELECTION_TOKEN', 'Selection token is invalid');
    }

    if (!isAllowedSelectionArray(allowed)) {
      throw new AppError(401, 'INVALID_SELECTION_TOKEN', 'Selection token is invalid');
    }

    if (typeof iat !== 'number' || typeof exp !== 'number') {
      throw new AppError(401, 'INVALID_SELECTION_TOKEN', 'Selection token is invalid');
    }

    return {
      purpose: 'instance_selection',
      email,
      allowed,
      iat,
      exp,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'INVALID_SELECTION_TOKEN', 'Selection token is invalid');
  }
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    const sub = decoded.sub;
    const iid = decoded.iid;
    const uid = decoded.uid;
    const roles = decoded.roles;
    const tv = decoded.tv;
    const iat = decoded.iat;
    const exp = decoded.exp;

    if (typeof sub !== 'string' || !sub) {
      throw Errors.authInvalid();
    }

    if (!(iid === null || typeof iid === 'string')) {
      throw Errors.authInvalid();
    }

    if (!(uid === null || typeof uid === 'string')) {
      throw Errors.authInvalid();
    }

    if (!isStringArray(roles) || roles.length === 0) {
      throw Errors.authInvalid();
    }

    if (typeof tv !== 'number' || !Number.isInteger(tv)) {
      throw Errors.authInvalid();
    }

    if (typeof iat !== 'number' || typeof exp !== 'number') {
      throw Errors.authInvalid();
    }

    return {
      sub,
      iid,
      uid,
      roles,
      tv,
      iat,
      exp,
    };
  } catch {
    throw Errors.authInvalid();
  }
}

export function generateRefreshToken(tokenVersion: number): string {
  const random = crypto.randomBytes(48).toString('base64url');
  return `${tokenVersion}.${random}`;
}

export function extractTokenVersionFromRefreshToken(refreshToken: string): number | null {
  const [versionPart] = refreshToken.split('.', 1);
  const parsed = Number.parseInt(versionPart, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

export function getRefreshExpiry(from = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
  return expiresAt;
}
