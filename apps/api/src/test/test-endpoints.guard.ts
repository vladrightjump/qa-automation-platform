import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/**
 * Gates test-only endpoints behind ENABLE_TEST_ENDPOINTS=true. When
 * disabled, behaves as if the routes don't exist (404) so the test
 * seam is invisible in production-shaped deployments.
 */
@Injectable()
export class TestEndpointsGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext): boolean {
    if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
      throw new NotFoundException();
    }
    return true;
  }
}
