import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordService } from './services/password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserRepository } from 'src/database/repositories/user/user.repository';
import { LibrariesModule } from '../libraries/libraries.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '604800s',
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
    LibrariesModule,
    MailModule,
    PrismaModule
  ],
  providers: [AuthService, EmailVerificationService, PasswordService, JwtStrategy, UserRepository],
  controllers: [AuthController]
})
export class AuthModule {}
