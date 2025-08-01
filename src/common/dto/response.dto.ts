import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T = any> {
    @ApiProperty({ example: 'Operation completed successfully' })
    message: string;

    @ApiProperty({ example: 200 })
    statusCode?: number;

    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: '2023-12-01T10:00:00Z' })
    timestamp?: string;

    @ApiProperty({ description: 'Response data' })
    data?: T;
}
