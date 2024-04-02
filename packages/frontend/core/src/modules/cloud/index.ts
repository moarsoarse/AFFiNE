export { AffineCloudAuthService } from './services/auth';
export { ServerConfigService } from './services/server-config';
export { useServerConfig } from './views/server-config';

import { type Framework, GlobalState } from '@toeverything/infra';

import { AffineCloudAuthSession } from './entities/session';
import { AffineCloudAuthService } from './services/auth';
import { ServerConfigService } from './services/server-config';

export function configureCloudModule(framework: Framework) {
  framework
    .service(ServerConfigService)
    .service(AffineCloudAuthService)
    .entity(AffineCloudAuthSession, [GlobalState]);
}
