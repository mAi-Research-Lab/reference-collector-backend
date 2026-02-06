import { ApiProperty } from '@nestjs/swagger';
import { UserResponse } from 'src/modules/user/dto/user.response';

export class AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', required: false })
  access_token?: string | null;

  @ApiProperty({ type: UserResponse })
  user: UserResponse;
} 