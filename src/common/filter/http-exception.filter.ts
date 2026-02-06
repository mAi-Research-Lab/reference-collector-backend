import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ErrorDto } from '../dto/error.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse();

    console.log(exception);

    const statusCode = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorResponseObj: { [key: string]: any } = exception instanceof HttpException
      ? exception.getResponse() as { [key: string]: any }
      : { message: 'Internal server error', statusCode: statusCode };

    if (exception instanceof Error && exception.name === 'ValidationError') {
      errorResponseObj = {
        message: 'Validation error',
        details: exception.message,
      };
    }

    const errorDto = new ErrorDto(
      errorResponseObj.message || 'An error occurred',
      errorResponseObj.errorCode || this.getErrorCodeFromStatus(statusCode),
      statusCode,
      errorResponseObj.details
    );

    response.status(statusCode).json(errorDto);
  }

  private getErrorCodeFromStatus(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}