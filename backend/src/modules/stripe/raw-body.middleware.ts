import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const isWebhook = req.url?.includes('/stripe/webhook') ||
                      req.path?.includes('/stripe/webhook') ||
                      req.originalUrl?.includes('/stripe/webhook') ||
                      req.originalUrl === '/api/v1/stripe/webhook';

    if (isWebhook) {
      if ((req as any).body && !req.readable) {
        (req as any).rawBody = Buffer.from(JSON.stringify((req as any).body));
        return next();
      }

      const chunks: Buffer[] = [];
      let dataReceived = false;

      req.on('data', (chunk: Buffer) => {
        dataReceived = true;
        chunks.push(chunk);
      });

      req.on('end', () => {
        if (!dataReceived) {
          if ((req as any).body) {
            (req as any).rawBody = Buffer.from(JSON.stringify((req as any).body));
          } else {
            (req as any).rawBody = Buffer.from('');
          }
        } else {
          const rawBody = Buffer.concat(chunks);
          (req as any).rawBody = rawBody;
        }
        next();
      });

      setTimeout(() => {
        if (!res.headersSent) {
          next();
        }
      }, 1000);
    } else {
      next();
    }
  }
}
