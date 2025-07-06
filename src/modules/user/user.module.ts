import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from 'src/database/repositories/user/user.repository';

@Module({
  providers: [
    UserRepository,
    UserService,
  ],
  controllers: [UserController]
})
export class UserModule {}
