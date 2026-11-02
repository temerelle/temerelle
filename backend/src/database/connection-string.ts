// Neon's URLs say sslmode=require. pg treats it as verify-full today but will switch to libpq's weaker meaning
// (encrypt, don't check the certificate) in pg 9, and warns about it on every start. Asking for verify-full
// keeps today's behavior. A URL without sslmode (local Docker) is left alone
export function withVerifiedSsl(url: string | undefined): string | undefined {
  return url?.replace(/([?&])sslmode=(?:prefer|require|verify-ca)(?=&|$)/, '$1sslmode=verify-full');
}
