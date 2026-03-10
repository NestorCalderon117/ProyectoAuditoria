import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/patients',
  '/medical-records',
  '/audit-logs',
  '/findings',
  '/hipaa-controls',
  '/incidents',
  '/users',
  '/reports',
  '/profile',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Verificar si existe la cookie refreshToken
    const refreshToken = request.cookies.get('refreshToken');

    if (!refreshToken) {
      // No hay cookie de sesión, redirigir a login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si es login y tiene refreshToken, redirigir a dashboard
  if (pathname === '/login') {
    const refreshToken = request.cookies.get('refreshToken');
    if (refreshToken) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
