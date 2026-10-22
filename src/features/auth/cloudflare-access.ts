// Cloudflare Access identifies the operator before the SPA loads. The browser
// never sees a token: Access sets an HttpOnly cookie and this same-origin URL
// returns the verified identity. See docs/14-cloudflare-access.md.
export type AccessIdentity = {
  id?: string;
  name?: string;
  email?: string;
  iat?: number;
  idp?: {
    type?: string;
  };
};

export const ACCESS_IDENTITY_PATH = "/cdn-cgi/access/get-identity";
export const ACCESS_LOGOUT_PATH = "/cdn-cgi/access/logout";

export async function fetchAccessIdentity(): Promise<AccessIdentity | null> {
  try {
    const response = await fetch(ACCESS_IDENTITY_PATH, {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "manual",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    // An expired Access session redirects to the Access login page. With
    // redirect: "manual" that surfaces as an opaque redirect, not a CORS error.
    if (response.type === "opaqueredirect" || !response.ok) {
      return null;
    }

    const identity = (await response.json()) as AccessIdentity | null;
    if (!identity || typeof identity.email !== "string" || identity.email.trim() === "") {
      return null;
    }
    return identity;
  } catch {
    // No Access in front of this origin, a network failure, or a non-JSON body.
    return null;
  }
}
