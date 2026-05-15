import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { S3StorageService } from '../references/services/s3-storage.service';
import { AiController } from './ai.controller';
import { AiGateway } from './gateways/ai.gateway';
import { AiContextService } from './services/ai-context.service';
import { AiQuotaService } from './services/ai-quota.service';
import { AiService } from './services/ai.service';

@Module({
    imports: [
        ConfigModule,
        UserModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET') || 'defaultSecretKey',
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRATION') || '604800s',
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AiController],
    providers: [AiService, AiContextService, AiQuotaService, AiGateway, S3StorageService],
    exports: [AiService],
})
export class AiModule { }
