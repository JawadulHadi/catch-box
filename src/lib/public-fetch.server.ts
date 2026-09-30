// Fetches pages for the scraper builder without letting a page address reach private
// networks (cloud metadata, databases, localhost). Every hostname is resolved and every
// address checked at connect time, so DNS tricks and redirects can't slip past.
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch, type Response } from "undici";

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    // IPv4-mapped addresses (::ffff:10.0.0.1) are checked as the IPv4 they carry.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
    return mapped ? blocked.check(mapped, "ipv4") : blocked.check(address, "ipv6");
  }
  return true;
}

class PrivateAddressError extends Error {
  constructor() {
    super("That address points to a private network, so Catchbox won't open it.");
  }
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "", 0);
    if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new PrivateAddressError(), "", 0);
    }
    if (options.all) {
      return (callback as unknown as (err: null, list: LookupAddress[]) => void)(null, addresses);
    }
    const [first] = addresses as [LookupAddress];
    callback(null, first.address, first.family);
  });
};

const agent = new Agent({ connect: { lookup: safeLookup }, connections: 16 });

function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That isn't a valid web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Please use an address that starts with http or https.");
  }
  // Literal IPs skip DNS, so check them here too.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isBlockedAddress(host)) throw new PrivateAddressError();
  if (/(^|\.)(localhost|local|internal)\.?$/i.test(host)) throw new PrivateAddressError();
  return url;
}

export function assertPublicUrl(raw: string): void {
  checkUrl(raw);
}

const MAX_REDIRECTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

/** GETs a public page, following up to five redirects with every hop re-checked. */
export async function fetchPublicPage(startUrl: string): Promise<{ status: number; html: string }> {
  let url = checkUrl(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await undiciFetch(url, {
        dispatcher: agent,
        redirect: "manual",
        headers: { "User-Agent": "CatchboxBot/1.0" },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      // fetch reports every network failure as "fetch failed"; the cause says why.
      const cause = error instanceof Error ? error.cause : undefined;
      if (cause instanceof PrivateAddressError) throw cause;
      if (cause instanceof Error && "code" in cause && cause.code === "ENOTFOUND") {
        throw new Error(`We couldn't find ${url.hostname}. Check the address.`);
      }
      throw new Error("We couldn't open the page.");
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = checkUrl(new URL(location, url).toString());
      continue;
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error("That page is larger than 5 MB.");
    }
    const html = await response.text();
    return { status: response.status, html: html.slice(0, MAX_BYTES) };
  }
  throw new Error(`The page redirected more than ${MAX_REDIRECTS} times.`);
}
