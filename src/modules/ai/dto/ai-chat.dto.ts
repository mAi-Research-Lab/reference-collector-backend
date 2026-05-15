import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export type AiChatMode = 'library' | 'document';

export class AiChatDto {
    @IsString()
    @MaxLength(8000)
    prompt: string;

    @IsUUID()
    libraryId: string;

    @IsOptional()
    @IsUUID()
    documentId?: string;

    @IsOptional()
    @IsIn(['library', 'document'])
    mode?: AiChatMode;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    referenceIds?: string[];

    @IsOptional()
    @IsString()
    documentTitle?: string;

    @IsOptional()
    @IsString()
    documentHtml?: string;

    @IsOptional()
    @IsString()
    selectedText?: string;
}
