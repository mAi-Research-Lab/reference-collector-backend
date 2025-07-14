import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { LibrariesModule } from './modules/libraries/libraries.module';

@Module({
  imports: [DatabaseModule, UserModule, AuthModule, InstitutionModule, LibrariesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
