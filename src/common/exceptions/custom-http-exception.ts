import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomHttpException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    errorCode: string,
    details?: any
  ) {
    super(
      {
        message,
        errorCode,
        details,
        statusCode
      },
      statusCode
    );
  }
}