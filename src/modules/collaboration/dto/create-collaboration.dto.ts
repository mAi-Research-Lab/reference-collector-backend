import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsArray, IsObject } from "class-validator";
import { InputJsonValue } from "generated/prisma/runtime/library";

export class CreateCollaborationDto {
    @ApiProperty({
        example: [
            {
                userId: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
                socketId: 'socket-123',
                joinedAt: '2024-01-15T10:30:00.000Z',
                lastSeen: '2024-01-15T10:32:00.000Z',
                cursorPosition: {
                    line: 5,
                    character: 12
                },
                isTyping: false
            }
        ],
        description: 'Array of participants in the collaboration session'
    })
    @IsArray()
    @IsOptional()
    participants?: InputJsonValue[] | null;

    @ApiProperty({
        example: [
            {
                id: "op-123",
                type: "insert",
                position: 5,
                content: "Hello World",
                userId: "14e56bb0-ed2f-4567-bb07-a3b2649ed80d",
                timestamp: "2024-01-15T10:30:00.000Z"
            }
        ],
        description: 'Array of operation logs for tracking changes'
    })
    @IsArray()
    @IsOptional()
    operationLog?: InputJsonValue[] | null;

    @ApiProperty({
        example: {
            content: "Hello World",
            contentDelta: "[{\"insert\":\"Hello World\"}]",
            version: 1,
            lastModifiedAt: "2024-01-15T10:30:00.000Z"
        },
        description: 'Current state of the document'
    })
    @IsObject()
    @IsOptional()
    currentState?: InputJsonValue | null;

    @ApiProperty({
        example: {
            cursors: {
                "user-1": {
                    position: 245,
                    selection: { start: 240, end: 250 },
                    color: "#ff6b6b",
                    lastUpdate: "2024-01-15T10:32:15.000Z"
                }
            },
            activeEditors: [
                {
                    userId: "user-1",
                    section: "paragraph-3",
                    editingMode: "text",
                    startedAt: "2024-01-15T10:30:00.000Z"
                }
            ],
            permissions: {
                "user-1": ["read", "write", "comment"]
            }
        },
        description: 'Session-specific data like cursors, active editors, etc.'
    })
    @IsObject()
    @IsOptional()
    sessionData?: InputJsonValue | null;

    @ApiProperty({
        example: {
            strategy: "last-writer-wins",
            pendingConflicts: [],
            autoMergeRules: {
                textInsertions: "append",
                formatting: "preserve-latest",
                deletions: "require-manual-review"
            }
        },
        description: 'Conflict resolution configuration and pending conflicts'
    })
    @IsObject()
    @IsOptional()
    conflictResolution?: InputJsonValue | null;
}