import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T = any> {
    @ApiProperty({
        description: 'Whether the operation was successful',
        example: true
    })
    success: boolean;

    @ApiProperty({
        description: 'Success message',
        example: 'Operation completed successfully'
    })
    message: string;

    @ApiProperty({
        description: 'Response data',
        required: false
    })
    data?: T;

    @ApiProperty({
        description: 'Timestamp',
        example: '2024-01-15T10:30:00Z'
    })
    timestamp: string;

    @ApiProperty({
        description: 'HTTP status code',
        example: 200
    })
    statusCode: number;

    constructor(
        success: boolean,
        message: string,
        data?: T,
        statusCode: number = 200
    ) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = new Date().toISOString();
        this.statusCode = statusCode;
    }

    // Static method for successful response
    static success<T>(
        message: string = 'Operation completed successfully',
        data?: T,
        statusCode: number = 200
    ): ResponseDto<T> {
        return new ResponseDto<T>(true, message, data, statusCode);
    }
}
