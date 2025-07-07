import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'src/database/repositories/user/user.repository';
import { User } from 'generated/prisma';
import { UserResponse } from 'src/modules/user/dto/user.response';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly userRepository: UserRepository
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecretKey',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub)


    if (!user) {
      throw new UnauthorizedException();
    }

    return this.formatUserResponse(user);
  }

  private formatPreferences(preferences?: any): Record<string, any> | null {
    if (!preferences) {
      return null;
    }

    if (typeof preferences === 'object') {
      return preferences;
    } else {
      return { value: preferences };
    }
  }

  private formatUserResponse(user: User): UserResponse {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = user;
    return {
      ...userResponse,
      preferences: this.formatPreferences(user.preferences) || {},
    };
  }
}
