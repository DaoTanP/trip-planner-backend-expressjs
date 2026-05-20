import type { AuthProvider } from '@prisma/client';

import { AuthError } from '@/common/errors/auth-error.js';
import type { OAuthProviderVerifier } from '@/modules/auth/auth.types.js';

import { googleOAuthProvider } from './google-oauth.provider.js';

export class OAuthProviderRegistry {
  private readonly providers = new Map<Exclude<AuthProvider, 'EMAIL'>, OAuthProviderVerifier>();

  constructor(providers: OAuthProviderVerifier[] = [googleOAuthProvider]) {
    for (const provider of providers) {
      this.providers.set(provider.provider, provider);
    }
  }

  get(provider: Exclude<AuthProvider, 'EMAIL'>): OAuthProviderVerifier {
    const verifier = this.providers.get(provider);
    if (!verifier) {
      throw new AuthError({
        messageKey: 'errors.auth.oauthProviderNotConfigured',
        code: 'AUTH_OAUTH_PROVIDER_NOT_CONFIGURED'
      });
    }

    return verifier;
  }
}

export const oauthProviderRegistry = new OAuthProviderRegistry();
