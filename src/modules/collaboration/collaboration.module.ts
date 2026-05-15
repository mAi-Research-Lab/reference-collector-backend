import { Module } from '@nestjs/common';
import { CollaborationService } from './services/collaboration.service';
import { DocumentCollaborationGateway } from './gateways/document-collaboration.gateway';
import { OperationalTransformService } from './services/operational-transform.service';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentCollaboratorService } from '../documents/services/document-collaborator.service';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports:[
        ConfigModule,
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
        DocumentsModule,
        UserModule,
        MailModule
    ],
    providers:[
        CollaborationService,
        DocumentCollaboratorService,
        DocumentCollaborationGateway,
        OperationalTransformService
    ]
})
export class CollaborationModule {}
