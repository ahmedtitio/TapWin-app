// Minimal Express-compatible router that runs on Cloudflare Workers.
// Supports: router.get/post/patch/delete(path, [guards...], handler),
// res.status(n).json(x) chaining, req.params, req.query, req.body (parsed JSON),
// req.headers (plain object, lowercase keys).
// Handlers may return a Response directly or use res.json()/res.status().json().

class ResponseShim {
  constructor() {
    this._status = 200;
    this.response = null;
  }
  status(code) { this._status = code; return this; }
  json(obj) {
    this.response = new Response(JSON.stringify(obj), {
      status: this._status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    return this;
  }
  send(body) {
    this.response = new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: this._status });
    return this;
  }
  set(k, v) { (this._headers ||= {})[k] = v; return this; }
}

function compile(pattern) {
  // '/users/:id' -> regex + param names
  const names = [];
  const rx = new RegExp('^' + pattern.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, (m) => {
    names.push(m.slice(1));
    return '([^/]+)';
  }) + '$');
  return { rx, names };
}

export function Router() {
  const routes = [];
  function add(method, path, guards, handler) {
    const { rx, names } = compile(path);
    routes.push({ method, rx, names, guards: guards || [], handler, path });
  }
  function norm(args) {
    // args: [guardsArray..., handler] OR [handler] OR [mw1, mw2, ..., handler]
    const handler = args.at(-1);
    const guards = args.slice(0, -1).flat();
    return { guards, handler };
  }
  return {
    routes,
    get(path, ...a)    { const { guards, handler } = norm(a); add('GET', path, guards, handler); },
    post(path, ...a)   { const { guards, handler } = norm(a); add('POST', path, guards, handler); },
    patch(path, ...a)  { const { guards, handler } = norm(a); add('PATCH', path, guards, handler); },
    put(path, ...a)    { const { guards, handler } = norm(a); add('PUT', path, guards, handler); },
    delete(path, ...a) { const { guards, handler } = norm(a); add('DELETE', path, guards, handler); },
    use(...mws)        { routes.__globalGuards = (routes.__globalGuards || []).concat(mws.flat()); },

    /** Try to match a request. Returns a Response or null. */
    async handle(req) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.rx.exec(req.pathname);
        if (!m) continue;
        req.params = {};
        r.names.forEach((n, i) => { req.params[n] = decodeURIComponent(m[i + 1]); });
        const res = new ResponseShim();
        for (const g of (routes.__globalGuards || []).concat(r.guards)) {
          await g(req, res, () => {});
          if (res.response) return res.response;
        }
        try {
          const out = await r.handler(req, res);
          if (out instanceof Response) return out;
        } catch (e) {
          console.error(e);
          return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: 'خطأ داخلي في الخادم' }),
            { status: 500, headers: { 'content-type': 'application/json' } });
        }
        return res.response || new Response(null, { status: 204 });
      }
      return null;
    },
  };
}

/** Compose express-style middlewares (fn(req,res,next)) into one guard(req,res). */
export function guardChain(...middlewares) {
  return async (req, res) => {
    let idx = 0;
    const next = async (err) => {
      if (err) throw err;
      if (idx < middlewares.length) {
        const mw = middlewares[idx++];
        await mw(req, res, next);
      }
    };
    await next();
  };
}
