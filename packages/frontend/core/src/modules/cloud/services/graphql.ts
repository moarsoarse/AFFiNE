import {
  gqlFetcherFactory,
  GraphQLError,
  type GraphQLQuery,
  type QueryOptions,
  type QueryResponse,
} from '@affine/graphql';
import { Service } from '@toeverything/infra';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';

import type { AffineCloudAuthService } from './auth';
import type { AffineCloudFetchService } from './fetch';

export class AffineCloudGraphQLService extends Service {
  constructor(
    private readonly fetcher: AffineCloudFetchService,
    private readonly auth: AffineCloudAuthService
  ) {
    super();
  }

  private readonly rawGql = gqlFetcherFactory('/graphql', this.fetcher.fetch);

  rxGql = <Query extends GraphQLQuery>(
    options: QueryOptions<Query>
  ): Observable<QueryResponse<Query>> => {
    return from(this.gql(options));
  };

  gql = async <Query extends GraphQLQuery>(
    options: QueryOptions<Query>
  ): Promise<QueryResponse<Query>> => {
    try {
      return await this.rawGql(options);
    } catch (err) {
      if (err instanceof Array) {
        for (const error of err) {
          if (error instanceof GraphQLError && error.extensions?.code === 403) {
            this.auth.session.revalidate(true);
          }
        }
      }
      throw err;
    }
  };
}
