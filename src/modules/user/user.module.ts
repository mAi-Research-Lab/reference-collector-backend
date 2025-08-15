import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from 'src/database/repositories/user/user.repository';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule
  ],
  providers: [
    UserRepository,
    UserService,
  ],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
