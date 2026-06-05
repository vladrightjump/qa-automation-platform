import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type UserRole = 'USER' | 'ADMIN';

export interface AuthedUser {
  id: string;
  email: string;
  role: UserRole;
}

type ReqWithUser = Request & { user?: AuthedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<ReqWithUser>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = this.jwt.verify<{
        sub?: string;
        email?: string;
        role?: UserRole;
      }>(token);
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException();
      }
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role ?? 'USER',
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class AdminGuard extends AuthGuard {
  override canActivate(ctx: ExecutionContext): boolean {
    const ok = super.canActivate(ctx);
    if (!ok) return false;
    const req = ctx.switchToHttp().getRequest<ReqWithUser>();
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }
    return true;
  }
}
