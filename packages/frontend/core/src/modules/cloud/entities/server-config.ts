import {
  type OauthProvidersQuery,
  type ServerConfigQuery,
  ServerFeature,
} from '@affine/graphql';
import { oauthProvidersQuery, serverConfigQuery } from '@affine/graphql';
import { catchErrorInto, effect, Entity, LiveData } from '@toeverything/infra';
import { exhaustMap, map, mergeMap, NEVER, of } from 'rxjs';

import type { AffineCloudGraphQLService } from '../services/graphql';

type LowercaseServerFeature = Lowercase<ServerFeature>;
type ServerFeatureRecord = {
  [key in LowercaseServerFeature]: boolean;
};

type Config = ServerConfigQuery['serverConfig'] &
  OauthProvidersQuery['serverConfig'];

export class ServerConfig extends Entity {
  readonly config$ = new LiveData<Config | null>(null);
  readonly error$ = new LiveData<any>(null);

  readonly features$ = this.config$.map(config => {
    return config
      ? Array.from(new Set(config.features)).reduce((acc, cur) => {
          acc[cur.toLowerCase() as LowercaseServerFeature] = true;
          return acc;
        }, {} as ServerFeatureRecord)
      : null;
  });

  readonly credentialsRequirement$ = this.config$.map(config => {
    return config ? config.credentialsRequirement : null;
  });

  constructor(private readonly gqlService: AffineCloudGraphQLService) {
    super();
  }

  revalidate = effect(
    exhaustMap((_: boolean) => {
      return this.gqlService
        .rxGql({
          query: serverConfigQuery,
        })
        .pipe(
          mergeMap(serverConfigData => {
            if (
              serverConfigData.serverConfig.features.includes(
                ServerFeature.OAuth
              )
            ) {
              return this.gqlService
                .rxGql({
                  query: oauthProvidersQuery,
                })
                .pipe(
                  map(oauthProvidersData => ({
                    ...serverConfigData.serverConfig,
                    ...oauthProvidersData.serverConfig,
                  }))
                );
            }

            return of({ ...serverConfigData.serverConfig, oauthProviders: [] });
          }),
          mergeMap(config => {
            this.config$.next(config);
            return NEVER;
          }),
          catchErrorInto(this.error$)
        );
    })
  );

  revalidateIfNeeded = () => {
    if (!this.config$.value) {
      this.revalidate(true);
    }
    return this;
  };
}
