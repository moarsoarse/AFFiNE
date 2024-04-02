import { Service } from '@toeverything/infra';
import { from } from 'rxjs';

export function getAffineCloudBaseUrl(): string {
  if (environment.isDesktop) {
    return runtimeConfig.serverUrlPrefix;
  }
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

export class AffineCloudFetchService extends Service {
  rxFetch = (
    input: string,
    init?: RequestInit & {
      // https://github.com/microsoft/TypeScript/issues/54472
      priority?: 'auto' | 'low' | 'high';
    } & {
      traceEvent?: string;
    }
  ) => {
    return from(this.fetch(input, init));
  };

  fetch = async (input: string, init?: RequestInit): Promise<Response> => {
    return await fetch(input, init);
  };
}
