import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from 'src/database/repositories/user/user.repository';
import { ConfigModule } from '@nestjs/config';
import { S3StorageService } from '../references/services/s3-storage.service';

@Module({
  imports: [
    ConfigModule
  ],
  providers: [
    UserRepository,
    UserService,
    S3StorageService,
  ],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
