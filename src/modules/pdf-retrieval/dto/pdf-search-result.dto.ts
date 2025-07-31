import { ApiProperty } from "@nestjs/swagger";
import { PdfResultItem } from "../interfaces/pdf-source.interface";
import { PdfResultItemDto } from "./pdf-result.dto";

export class PdfSearchResultDto {
    @ApiProperty({ example: true })
    found: boolean;

    @ApiProperty({ type: [PdfResultItemDto] })
    results: PdfResultItem[];

    @ApiProperty({ example: 3 })
    totalSources: number;

    @ApiProperty({ example: 1000 })
    searchTime: number;

    @ApiProperty({ type: [String] })
    errors?: string[];
}