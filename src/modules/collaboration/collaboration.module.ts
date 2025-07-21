import { Module } from '@nestjs/common';
import { CollaborationService } from './services/collaboration.service';
import { DocumentCollaborationGateway } from './gateways/document-collaboration.gateway';

@Module({
    providers:[
        CollaborationService,
        DocumentCollaborationGateway
    ]
})
export class CollaborationModule {}
