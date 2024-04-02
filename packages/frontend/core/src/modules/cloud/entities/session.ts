import type { GlobalState } from '@toeverything/infra';
import {
  catchErrorInto,
  effect,
  Entity,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { exhaustMap, from, mergeMap, NEVER } from 'rxjs';

export interface AuthSessionInfo {
  account: AuthAccountInfo;
}

export interface AuthAccountInfo {
  id: string;
  label: string;
  email?: string;
  avatar?: string | null;
}

export class AffineCloudAuthSession extends Entity {
  id = 'affine-cloud' as const;

  session$: LiveData<
    | { status: 'unauthenticated' }
    | { status: 'authenticated'; session: AuthSessionInfo }
  > = LiveData.from(
    this.globalState.watch<AuthSessionInfo>('affine-cloud-auth'),
    null
  ).map(session =>
    session
      ? {
          status: 'authenticated',
          session: session as AuthSessionInfo,
        }
      : {
          status: 'unauthenticated',
        }
  );

  isRevalidating$ = new LiveData(false);
  error$ = new LiveData<Error | null>(null);

  constructor(private readonly globalState: GlobalState) {
    super();
  }

  revalidate = effect(
    exhaustMap((_: boolean) =>
      from(this.getSession()).pipe(
        mergeMap(sessionInfo => {
          this.saveSession(sessionInfo);
          return NEVER;
        }),
        catchErrorInto(this.error$),
        onStart(() => this.isRevalidating$.next(true)),
        onComplete(() => this.isRevalidating$.next(false))
      )
    )
  );

  private async getSession(): Promise<AuthSessionInfo | null> {
    const session = await getSession();

    if (session?.user) {
      const account = {
        id: session.user.id,
        email: session.user.email,
        label: session.user.name,
        avatar: session.user.avatarUrl,
      };
      const result = {
        account,
      };
      return result;
    } else {
      return null;
    }
  }

  private saveSession(session: AuthSessionInfo | null) {
    this.globalState.set<AuthSessionInfo>('affine-cloud-auth', session);
  }
}

function getBaseUrl(): string {
  if (environment.isDesktop) {
    return runtimeConfig.serverUrlPrefix;
  }
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

async function getSession() {
  const url = `${getBaseUrl()}/api/auth/session`;
  const options: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = await fetch(url, options);
  const data = (await res.json()) as { user?: User | null };
  if (!res.ok)
    throw new Error('Get session fetch error: ' + JSON.stringify(data));
  return data; // Return null if data empty
}

interface User {
  id: string;
  email: string;
  name: string;
  hasPassword: boolean;
  avatarUrl: string | null;
  emailVerified: string | null;
}
