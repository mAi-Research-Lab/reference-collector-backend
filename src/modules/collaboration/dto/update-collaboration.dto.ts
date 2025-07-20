import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsArray, IsObject, IsBoolean } from "class-validator";
import { JsonValue } from "generated/prisma/runtime/library";

export class UpdateCollaborationDto {
    @ApiProperty({
        example: [
            {
                userId: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
                socketId: 'socket-123',
                joinedAt: '2024-01-15T10:30:00.000Z',
                lastSeen: '2024-01-15T10:32:00.000Z',
                cursorPosition: {
                    line: 8,
                    character: 25
                },
                isTyping: true
            }
        ],
        description: 'Updated participants array'
    })
    @IsArray()
    @IsOptional()
    participants?: JsonValue[];

    @ApiProperty({
        example: [
            {
                id: "op-124",
                type: "delete",
                position: 10,
                content: "",
                userId: "14e56bb0-ed2f-4567-bb07-a3b2649ed80d",
                timestamp: "2024-01-15T10:33:00.000Z"
            }
        ],
        description: 'New operations to add to the log'
    })
    @IsArray()
    @IsOptional()
    operationLog?: JsonValue[];

    @ApiProperty({
        example: {
            content: "Hello World Updated",
            contentDelta: "[{\"retain\":11},{\"insert\":\" Updated\"}]",
            version: 2,
            lastModifiedAt: "2024-01-15T10:33:00.000Z"
        },
        description: 'Updated document state'
    })
    @IsObject()
    @IsOptional()
    currentState?: JsonValue;

    @ApiProperty({
        example: {
            cursors: {
                "user-1": {
                    position: 300,
                    selection: null,
                    color: "#ff6b6b",
                    lastUpdate: "2024-01-15T10:33:15.000Z"
                }
            }
        },
        description: 'Updated session data'
    })
    @IsObject()
    @IsOptional()
    sessionData?: JsonValue;

    @ApiProperty({
        example: {
            strategy: "operational-transform",
            pendingConflicts: [
                {
                    id: "conflict-123",
                    type: "text-overlap",
                    status: "resolved"
                }
            ]
        },
        description: 'Updated conflict resolution data'
    })
    @IsObject()
    @IsOptional()
    conflictResolution?: JsonValue;

    @ApiProperty({
        example: false,
        description: 'Whether the session is active'
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}