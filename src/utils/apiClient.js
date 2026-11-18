/**
 * Global API Client Helper
 * Automatically attaches the secure X-API-KEY header to all /api/ requests.
 */

export const ERP_API_KEY =
  process.env.NEXT_PUBLIC_ERP_API_KEY ||
  '646ba8462c474cbca6e140f27bf0889062b4da1d40cb4e9d83c961bbaee70f35';

export function getApiHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  if (ERP_API_KEY) {
    headers['X-API-KEY'] = ERP_API_KEY;
  }
  return headers;
}

export async function erpFetch(url, options = {}) {
  const headers = getApiHeaders(options.headers || {});
  return fetch(url, {
    ...options,
    headers
  });
}
