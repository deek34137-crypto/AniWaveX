import { routeRequest } from './router';

export interface Env {
  CORS_ALLOW_ORIGIN?: string;
  ENVIRONMENT?: string;
}

export default {
  async fetch(
    request: Request,
    _env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return routeRequest(request, ctx);
  },
};
