/**
 * External API Key Authentication Middleware
 *
 * Requires X-API-Key header for requests from external origins (non-localhost).
 * This protects the tunnel endpoint from unauthorized access while allowing
 * local development to work without keys.
 */

import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger.js';
import { AppError } from './error-handler.js';

const log = createLogger('external-api-key');

const VK_API_KEY = process.env.VK_API_KEY;

// Origins that bypass API key check (local development)
const BYPASS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Check if request is from localhost (no origin or localhost origin)
 */
function isLocalRequest(req: Request): boolean {
  const origin = req.get('origin');
  const host = req.get('host') || '';

  // No origin header typically means same-origin or direct request
  if (!origin) {
    // Check if host is localhost
    return host.includes('localhost') || host.includes('127.0.0.1');
  }

  return BYPASS_ORIGINS.includes(origin);
}

/**
 * Middleware to require API key for external requests
 */
export function requireExternalApiKey(req: Request, res: Response, next: NextFunction): void {
  // Skip if no API key is configured (dev mode)
  if (!VK_API_KEY) {
    return next();
  }

  // Skip for local requests
  if (isLocalRequest(req)) {
    return next();
  }

  // Check API key header
  const providedKey = req.get('X-API-Key');

  if (!providedKey) {
    log.warn(
      {
        origin: req.get('origin'),
        path: req.path,
        ip: req.ip,
      },
      'External request missing API key'
    );

    throw new AppError(401, 'API key required', 'API_KEY_MISSING');
  }

  if (providedKey !== VK_API_KEY) {
    log.warn(
      {
        origin: req.get('origin'),
        path: req.path,
        ip: req.ip,
      },
      'External request with invalid API key'
    );

    throw new AppError(401, 'Invalid API key', 'API_KEY_INVALID');
  }

  // Valid API key
  log.debug({ origin: req.get('origin'), path: req.path }, 'External API key validated');
  next();
}
