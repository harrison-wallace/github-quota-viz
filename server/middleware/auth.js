'use strict';

/**
 * API key authentication middleware.
 * Expects the header:  X-API-Key: <API_SECRET_KEY>
 *
 * Uses a constant-time comparison to prevent timing attacks.
 */

const crypto = require('crypto');

function apiKeyAuth(req, res, next) {
  const expected = process.env.API_SECRET_KEY;

  if (!expected) {
    console.error('[auth] API_SECRET_KEY env var is not set. Refusing all requests.');
    return res.status(503).json({ error: 'Server misconfiguration: API key not set.' });
  }

  const provided = req.headers['x-api-key'] || '';

  // Constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.alloc(expectedBuf.length);
  Buffer.from(provided).copy(providedBuf);

  const match =
    provided.length === expected.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!match) {
    return res.status(401).json({ error: 'Unauthorised.' });
  }

  next();
}

module.exports = apiKeyAuth;
