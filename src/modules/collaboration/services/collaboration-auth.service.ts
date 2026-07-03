import type { IncomingMessage } from 'node:http';

import { AuthError } from '@/common/errors/auth-error.js';
import { env } from '@/config/env.js';
import { verifyAccessToken } from '@/modules/auth/auth.tokens.js';
import { usersRepository, type UsersRepository } from '@/modules/users/users.repository.js';
import type {
  CollaborationUser,
  CollaborationUserRole
} from '@/modules/collaboration/types/collaboration.types.js';

type CollaborationUserRecord = {
  id: string;
  email: string;
  role: unknown;
  name: string;
  avatarUrl: string | null;
};

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, item) => {
    const [rawName, ...rawValue] = item.trim().split('=');

    if (!rawName) {
      return cookies;
    }

    try {
      cookies[decodeURIComponent(rawName)] = decodeURIComponent(rawValue.join('='));
    } catch {
      cookies[rawName] = rawValue.join('=');
    }

    return cookies;
  }, {});
}

function getBearerToken(request: IncomingMessage) {
  const header = request.headers.authorization;

  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function getQueryToken(url: URL) {
  return url.searchParams.get('accessToken') ?? url.searchParams.get('token');
}

export class CollaborationAuthService {
  constructor(private readonly users: UsersRepository = usersRepository) {}

  async authenticateRequest(request: IncomingMessage, url: URL): Promise<CollaborationUser> {
    const cookies = parseCookies(request.headers.cookie);
    const token =
      getBearerToken(request) ?? getQueryToken(url) ?? cookies[env.AUTH_ACCESS_COOKIE_NAME] ?? null;

    if (!token) {
      throw new AuthError({
        messageKey: 'errors.auth.missingBearer',
        code: 'AUTH_MISSING_TOKEN'
      });
    }

    const payload = verifyAccessToken(token);
    const user = (await this.users.findById(
      payload.sub
    )) as unknown as CollaborationUserRecord | null;

    if (!user) {
      throw new AuthError({
        messageKey: 'errors.auth.invalidAccessToken',
        code: 'AUTH_INVALID_SESSION'
      });
    }

    return {
      id: user.id,
      email: user.email,
      role: normalizeCollaborationUserRole(user.role),
      name: user.name,
      avatarUrl: user.avatarUrl
    };
  }
}

export const collaborationAuthService = new CollaborationAuthService();

function normalizeCollaborationUserRole(role: unknown): CollaborationUserRole {
  return role === 'ADMIN' ? 'ADMIN' : 'USER';
}
