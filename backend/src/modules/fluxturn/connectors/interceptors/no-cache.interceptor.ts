import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor that disables HTTP caching for all responses.
 * This ensures that connector credentials are always fetched fresh from the database.
 */
@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        // Set aggressive no-cache headers
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        response.setHeader('Surrogate-Control', 'no-store');
        // Remove any ETag to prevent 304 responses
        response.removeHeader('ETag');
        response.removeHeader('Last-Modified');
      }),
    );
  }
}
