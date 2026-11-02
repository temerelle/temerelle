import type { Request } from 'express';

// Vercel sets x-vercel-forwarded-for / x-real-ip itself (clients can't spoof them there); locally it's the socket
export function clientIp(req: Request): string {
  const header = (name: string) => {
    const value = req.headers[name];
    return (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim();
  };
  return (
    header('x-vercel-forwarded-for') ||
    header('x-real-ip') ||
    header('x-forwarded-for') ||
    req.socket.remoteAddress ||
    '-'
  );
}
