/** Accept only a plain public hostname: no IPs, localhost, ports or paths. */
export function cleanDomain(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  if (!/^(?=.{4,253}$)([a-z0-9א-ת-]{1,63}\.)+[a-zא-ת]{2,63}$/.test(host)) return null;
  if (host.endsWith(".local") || host.endsWith(".internal")) return null;
  return host;
}
