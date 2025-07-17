import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseDto } from '../dto/api-response.dto';

export function ApiResponseWrapper(dataType: any, status: number = 200, description: string) {
  return applyDecorators(
    ApiExtraModels(ResponseDto, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(dataType)
              }
            }
          }
        ]
      }
    })
  );
}

export function ApiResponseArrayWrapper(dataType: any, status: number = 200, description: string) {
  return applyDecorators(
    ApiExtraModels(ResponseDto, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: {
                  $ref: getSchemaPath(dataType)
                }
              }
            }
          }
        ]
      }
    })
  );
}


export function ApiSuccessResponse(dataType: any, statusCode?: number, description?: string) {
  return ApiResponseWrapper(dataType, statusCode || 200, description || 'Operation successful');
}

export function ApiSuccessArrayResponse(dataType: any, statusCode?: number, description?: string) {
  return ApiResponseArrayWrapper(dataType, statusCode || 200, description || 'List retrieved successfully');
}

export function ApiErrorResponse(statusCode: number, description: string) {
  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            oneOf: [
              {
                type: 'string',
                example: description
              },
              {
                type: 'array',
                items: { type: 'string' },
                example: description
              }
            ]
          },
          errorCode: {
            type: 'string',
            example: 'ERROR_CODE'
          },
          statusCode: {
            type: 'number',
            example: statusCode
          },
          details: {
            type: 'object',
          },
          timestamp: {
            type: 'string',
            example: '2025-07-17T12:56:38.669Z'
          }
        }
      }
    })
  );
}