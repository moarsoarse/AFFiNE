import { Service } from '@toeverything/infra';

import { AffineCloudAuthSession } from '../entities/session';

export class AffineCloudAuthService extends Service {
  id = 'affine-cloud' as const;

  session = this.framework.createEntity(AffineCloudAuthSession);
}
