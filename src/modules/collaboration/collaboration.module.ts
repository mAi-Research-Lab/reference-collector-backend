import { Module } from '@nestjs/common';
import { CollaborationService } from './services/collaboration.service';
import { DocumentCollaborationGateway } from './gateways/document-collaboration.gateway';
import { OperationalTransformService } from './services/operational-transform.service';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentCollaboratorService } from '../documents/services/document-collaborator.service';
import { UserModule } from '../user/user.module';

@Module({
    imports:[
        DocumentsModule,
        UserModule
    ],
    providers:[
        CollaborationService,
        DocumentCollaboratorService,
        DocumentCollaborationGateway,
        OperationalTransformService
    ]
})
export class CollaborationModule {}
