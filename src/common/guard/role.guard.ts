import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass()
  ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();    
    const user = request.user;
    
    
    
    if (!user) {
      return false;
    }

    if (!user?.userType) {
      return false;
    }
    return requiredRoles.includes(user.userType);
  }
} 