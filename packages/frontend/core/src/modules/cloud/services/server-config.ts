import { Service } from '@toeverything/infra';

import { ServerConfig } from '../entities/server-config';

export class ServerConfigService extends Service {
  serverConfig = this.framework.createEntity(ServerConfig);
}
