import { Module } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { InstitutionController } from './institution.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule
  ],
  providers: [InstitutionService],
  controllers: [InstitutionController]
})
export class InstitutionModule {}
