import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserResponse } from 'src/modules/user/dto/user.response';
import { UserService } from 'src/modules/user/user.service';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecretKey',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userService.findById(payload.sub)


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

  private formatUserResponse(user: any): UserResponse {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = user;
    return {
      ...userResponse,
      preferences: this.formatPreferences(user.preferences) || {},
    };
  }
}
