import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ 
    description: 'Indicates operation failed',
    example: false 
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Error message',
    example: 'User not found' 
  })
  message: string;

  @ApiProperty({ 
    description: 'Error code',
    example: 'USER_NOT_FOUND' 
  })
  errorCode: string;

  @ApiProperty({ 
    description: 'Detailed error information',
    required: false,
    example: { field: 'email', issue: 'invalid format' }
  })
  details?: any;

  @ApiProperty({ 
    description: 'Timestamp',
    example: '2024-01-15T10:30:00Z' 
  })
  timestamp: string;

  @ApiProperty({ 
    description: 'HTTP status code',
    example: 404 
  })
  statusCode: number;

  constructor(
    message: string,
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