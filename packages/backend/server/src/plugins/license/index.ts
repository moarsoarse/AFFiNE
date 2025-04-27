import { Module } from '@nestjs/common';

import { PermissionModule } from '../../core/permission';
import { QuotaModule } from '../../core/quota';
import { LicenseResolver } from './resolver';
import { LicenseService } from './service';

@Module({
  imports: [QuotaModule, PermissionModule],
  providers: [LicenseService, LicenseResolver],
})
export class LicenseModule {}
