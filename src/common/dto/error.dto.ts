import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ 
    description: 'Indicates operation failed',
    example: false 
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Error message(s)',
    oneOf: [
      { type: 'string', example: 'User not found' },
      { 
        type: 'array', 
        items: { type: 'string' },
        example: ['state must be a string', 'state should not be empty']
      }
    ]
  })
  message: string | string[];

  @ApiProperty({ 
    description: 'Error code',
    example: 'BAD_REQUEST' 
  })
  errorCode: string;

  @ApiProperty({ 
    description: 'HTTP status code',
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'Detailed error information',
    required: false,
    example: { field: 'email', issue: 'invalid format' }
  })
  details?: any;

  @ApiProperty({ 
    description: 'Timestamp',
    example: '2025-07-17T12:56:38.669Z' 
  })
  timestamp: string;

  constructor(
    message: string | string[],
    errorCode: string,
    statusCode: number,
    details?: any
  ) {
    this.success = false;
    this.message = message;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}