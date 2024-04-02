import { apis } from '@affine/electron-api';
import { getBaseUrl, OAuthProviderType } from '@affine/graphql';

import { CLOUD_WORKSPACE_CHANGED_BROADCAST_CHANNEL_KEY } from '../modules/workspace-engine';

type Providers = 'credentials' | 'email' | OAuthProviderType;

export const signInCloud = async (
  provider: Providers,
  credentials?: { email: string; password?: string },
  searchParams: Record<string, any> = {}
): Promise<Response | undefined> => {
  if (provider === 'credentials' || provider === 'email') {
    if (!credentials) {
      throw new Error('Invalid Credentials');
    }

    return signIn(credentials, searchParams);
  } else if (OAuthProviderType[provider]) {
    if (environment.isDesktop) {
      await apis?.ui.openExternal(
        `${
          runtimeConfig.serverUrlPrefix
        }/desktop-signin?provider=${provider}&redirect_uri=${buildRedirectUri(
          '/open-app/signin-redirect'
        )}`
      );
    } else {
      location.href = `${
        runtimeConfig.serverUrlPrefix
      }/oauth/login?provider=${provider}&redirect_uri=${encodeURIComponent(
        searchParams.redirectUri ?? location.pathname
      )}`;
    }

    return;
  } else {
    throw new Error('Invalid Provider');
  }
};

async function signIn(
  credential: { email: string; password?: string },
  searchParams: Record<string, any> = {}
) {
  const url = new URL(getBaseUrl() + '/api/auth/sign-in');

  for (const key in searchParams) {
    url.searchParams.set(key, searchParams[key]);
  }

  const redirectUri = new URL(location.href);

  if (environment.isDesktop) {
    redirectUri.pathname = buildRedirectUri('/open-app/signin-redirect');
  }

  url.searchParams.set('redirect_uri', redirectUri.toString());

  return fetch(url.toString(), {
    method: 'POST',
    body: JSON.stringify(credential),
    headers: {
      'content-type': 'application/json',
    },
  });
}

export const signOutCloud = async (redirectUri?: string) => {
  return fetch(getBaseUrl() + '/api/auth/sign-out').then(result => {
    if (result.ok) {
      new BroadcastChannel(
        CLOUD_WORKSPACE_CHANGED_BROADCAST_CHANNEL_KEY
      ).postMessage(1);

      if (redirectUri && location.href !== redirectUri) {
        setTimeout(() => {
          location.href = redirectUri;
        }, 0);
      }
    }
  });
};

export function buildRedirectUri(callbackUrl: string) {
  const params: string[][] = [];
  if (environment.isDesktop && window.appInfo.schema) {
    params.push(['schema', window.appInfo.schema]);
  }
  const query =
    params.length > 0
      ? '?' + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
      : '';
  return callbackUrl + query;
}
