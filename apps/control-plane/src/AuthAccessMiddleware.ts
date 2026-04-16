import type express from 'express';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

interface AccessRule {
  methods: string[];
  path: RegExp;
  minRole: Role;
  action?: string;
}

interface AccessMiddlewareDeps {
  requireRole: (req: express.Request, res: express.Response, role: Role) => unknown | null;
  requireAccess: (req: express.Request, res: express.Response, input: { minRole: Role; action: string }) => unknown | null;
}

const PUBLIC_PATTERNS: RegExp[] = [
  /^\/api\/health$/,
  /^\/api\/auth\/register$/,
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/refresh$/,
  /^\/api\/auth\/sso\/login$/,
  /^\/api\/auth\/scim\/v2\//,
  /^\/api\/events\/stream$/,
];

const DECLARATIVE_ACCESS_RULES: AccessRule[] = [
  { methods: ['GET'], path: /^\/api\/auth\/me$/, minRole: 'member' },
  { methods: ['POST'], path: /^\/api\/auth\/logout$/, minRole: 'member' },
  { methods: ['GET'], path: /^\/api\/auth\/rbac\/matrix$/, minRole: 'member' },
  { methods: ['GET'], path: /^\/api\/auth\/abac\/policies$/, minRole: 'member' },
  { methods: ['POST'], path: /^\/api\/auth\/abac\/evaluate$/, minRole: 'member' },
  { methods: ['GET'], path: /^\/api\/auth\/sso\/providers$/, minRole: 'member' },
  { methods: ['POST'], path: /^\/api\/auth\/sso\/providers$/, minRole: 'admin', action: 'config:write' },
  { methods: ['*'], path: /^\/api\/cockpit\/secrets(\/.*)?$/, minRole: 'admin', action: 'secrets:write' },
  { methods: ['GET'], path: /^\/api\/governance\//, minRole: 'member' },
  { methods: ['POST', 'PATCH', 'DELETE', 'PUT'], path: /^\/api\/governance\//, minRole: 'admin', action: 'governance:write' },
  { methods: ['*'], path: /^\/api\/system\/control-plane\//, minRole: 'admin', action: 'runtime:write' },
  { methods: ['*'], path: /^\/api\/system\/billing\//, minRole: 'member', action: 'runtime:read' },
  { methods: ['*'], path: /^\/api\/workspace\/billing\//, minRole: 'member', action: 'runtime:read' },
  { methods: ['*'], path: /^\/api\/cockpit\/environments\//, minRole: 'member', action: 'runtime:write' },
];

const PROTECTED_PREFIXES = ['/api/system', '/api/cockpit', '/api/governance'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname));
}

function findRule(method: string, pathname: string): AccessRule | null {
  const upperMethod = String(method || 'GET').toUpperCase();
  for (const rule of DECLARATIVE_ACCESS_RULES) {
    if (!rule.path.test(pathname)) continue;
    if (rule.methods.includes('*') || rule.methods.includes(upperMethod)) return rule;
  }
  return null;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname.startsWith('/api/auth/');
}

export function registerAccessEnforcementMiddleware(app: express.Express, deps: AccessMiddlewareDeps): void {
  app.use('/api', (req, res, next) => {
    const pathname = `${String(req.baseUrl || '').trim()}${String(req.path || '').trim()}` || '/';
    if (isPublicPath(pathname)) {
      next();
      return;
    }

    const rule = findRule(req.method, pathname);
    if (rule) {
      const ok = rule.action
        ? deps.requireAccess(req, res, { minRole: rule.minRole, action: rule.action })
        : deps.requireRole(req, res, rule.minRole);
      if (!ok) return;
      next();
      return;
    }

    if (isProtectedPath(pathname)) {
      const ok = deps.requireRole(req, res, 'member');
      if (!ok) return;
    }
    next();
  });
}
