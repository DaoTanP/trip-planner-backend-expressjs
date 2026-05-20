import { OAuth2Client } from 'google-auth-library';
import type { Prisma } from '@prisma/client';

import { AuthError } from '@/common/errors/auth-error.js';
import { env } from '@/config/env.js';
import type { OAuthProviderVerifier, VerifiedOAuthProfile } from '@/modules/auth/auth.types.js';

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export class GoogleOAuthProvider implements OAuthProviderVerifier {
  readonly provider = 'GOOGLE' as const;

  private readonly client = new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID);

  async verifyCredential(credential: string): Promise<VerifiedOAuthProfile> {
    if (!env.GOOGLE_OAUTH_CLIENT_ID) {
      throw new AuthError({
        messageKey: 'errors.auth.oauthProviderNotConfigured',
        code: 'AUTH_OAUTH_PROVIDER_NOT_CONFIGURED'
      });
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_OAUTH_CLIENT_ID
      });
      const payload = ticket.getPayload();

      const issuer = payload?.iss;
      if (!payload?.sub || !payload.email || !issuer || !GOOGLE_ISSUERS.has(issuer)) {
        throw new AuthError({
          messageKey: 'errors.auth.oauthInvalidCredential',
          code: 'AUTH_OAUTH_FAILED'
        });
      }

      const providerProfile: Prisma.InputJsonObject = {
        issuer,
        audience: payload.aud ?? env.GOOGLE_OAUTH_CLIENT_ID,
        email: payload.email,
        emailVerified: payload.email_verified === true
      };

      if (payload.hd) providerProfile.hostedDomain = payload.hd;
      if (payload.locale) providerProfile.locale = payload.locale;
      if (payload.picture) providerProfile.picture = payload.picture;

      return {
        provider: this.provider,
        providerUserId: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === true,
        name: payload.name?.trim() || payload.email,
        avatarUrl: payload.picture ?? null,
        locale: payload.locale ?? null,
        profile: providerProfile
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError({
        messageKey: 'errors.auth.oauthInvalidCredential',
        code: 'AUTH_OAUTH_FAILED'
      });
    }
  }
}

export const googleOAuthProvider = new GoogleOAuthProvider();
