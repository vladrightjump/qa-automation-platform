import { AuthResultSchema, type AuthResult } from '@qa/contracts';
import { parseJson, type RequestContext } from './base';

export class AuthClient {
  constructor(private readonly ctx: RequestContext) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const res = await this.ctx.request.post(`${this.ctx.baseUrl}/auth/register`, {
      data: { email, password },
    });
    return parseJson(res, AuthResultSchema, 'auth.register');
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const res = await this.ctx.request.post(`${this.ctx.baseUrl}/auth/login`, {
      data: { email, password },
    });
    return parseJson(res, AuthResultSchema, 'auth.login');
  }
}
