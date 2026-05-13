import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { NextAuthUser } from '../guards/nextauth.guard';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): NextAuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
