jest.mock('../../utils/monitoring', () => ({
  cacheRequestsTotal: { inc: jest.fn() },
}));

const cacheControl = require('../../middlewares/cacheControl.middleware');
const { cacheRequestsTotal } = require('../../utils/monitoring');

describe('cacheControl middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const run = (mw, req) => {
    const res = {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
    };
    const next = jest.fn();
    mw(req, res, next);
    return { res, next };
  };

  it('applies private no-store headers and BYPASS tracking for private content', () => {
    const { res, next } = run(cacheControl({ policy: 'private' }), {
      method: 'GET',
      path: '/api/v1/download/1',
    });

    expect(res.headers['Cache-Control']).toBe('private, no-store');
    expect(res.headers['CDN-Cache-Control']).toBe('private, no-store');
    expect(cacheRequestsTotal.inc).toHaveBeenCalledWith({ status: 'BYPASS', policy: 'private' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('applies public max-age headers for shared content', () => {
    const { res } = run(cacheControl({ policy: 'public', maxAge: 3600 }), {
      method: 'POST',
      path: '/api/v1/files/download',
    });

    expect(res.headers['Cache-Control']).toBe('public, max-age=3600');
    expect(res.headers['CDN-Cache-Control']).toBe('public, s-maxage=3600');
    expect(cacheRequestsTotal.inc).toHaveBeenCalledWith({ status: 'BYPASS', policy: 'public' });
  });

  it('honours a custom maxAge', () => {
    const { res } = run(cacheControl({ policy: 'public', maxAge: 600 }), {
      method: 'GET',
      path: '/shared/abc',
    });

    expect(res.headers['Cache-Control']).toBe('public, max-age=600');
    expect(res.headers['CDN-Cache-Control']).toBe('public, s-maxage=600');
  });

  it('reads Cloudflare cf-cache-status (HIT) and tracks it as a metric', () => {
    run(cacheControl({ policy: 'public' }), {
      method: 'GET',
      path: '/shared/abc',
      headers: { 'cf-cache-status': 'HIT' },
    });

    expect(cacheRequestsTotal.inc).toHaveBeenCalledWith({ status: 'HIT', policy: 'public' });
  });

  it('reads x-cache-status (MISS) as a fallback', () => {
    run(cacheControl({ policy: 'public' }), {
      method: 'GET',
      path: '/shared/abc',
      headers: { 'x-cache-status': 'MISS' },
    });

    expect(cacheRequestsTotal.inc).toHaveBeenCalledWith({ status: 'MISS', policy: 'public' });
  });

  it('normalises unknown cache statuses to OTHER', () => {
    run(cacheControl({ policy: 'public' }), {
      method: 'GET',
      path: '/shared/abc',
      headers: { 'cf-cache-status': 'totally-unknown' },
    });

    expect(cacheRequestsTotal.inc).toHaveBeenCalledWith({ status: 'OTHER', policy: 'public' });
  });

  it('skips metric tracking for /metrics scrapes', () => {
    run(cacheControl({ policy: 'public' }), {
      method: 'GET',
      path: '/metrics',
    });

    expect(cacheRequestsTotal.inc).not.toHaveBeenCalled();
  });
});