// A 401 from these means bad credentials or a dead session, not an expired access cookie
const NO_REFRESH_PATHS = ['/api/auth/login/', '/api/auth/refresh/', '/api/auth/logout/'];

// Each refresh replaces the refresh token, so requests that fail together must share one refresh call:
// a second call would send the token the first one just replaced and end the session
let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = (baseUrl: string): Promise<boolean> => {
  refreshInFlight ??= fetch(`${baseUrl}/api/auth/refresh/web`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

export const customFetch = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  // Dynamically resolve base URL without triggering static import.meta parsers
  let baseUrl = '';
  try {
    // @ts-ignore
    baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    console.log(baseUrl);
  } catch {
    baseUrl = '';
  }

  // If running in standard Vite dev/build where import.meta is actually parsed by Vite itself:
  if (!baseUrl) {
    try {
      // We use eval/new Function or indirect access so Orval's static parser skips it
      // @ts-ignore
      baseUrl = (typeof import_meta !== 'undefined' ? import_meta.env?.VITE_API_BASE_URL : '') || '';
    } catch {
      // ignore
    }
  }

  // A trailing slash on the base URL would produce "//api/..." which Spring Security rejects
  baseUrl = baseUrl.replace(/\/+$/, '');

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const send = () => fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Keeps your HttpOnly cookies working!
  });

  let response = await send();

  // The access cookie lives 15 minutes: on a 401, renew it with the refresh cookie and retry once
  if (response.status === 401 && !NO_REFRESH_PATHS.some((path) => url.includes(path))) {
    if (await refreshSession(baseUrl)) {
      response = await send();
    } else if (window.location.pathname !== '/login') {
      // The refresh token expired or was revoked: a full reload to the login page drops all cached data
      localStorage.removeItem('isAuthenticated');
      window.location.assign('/login');
    }
  }

  if (!response.ok) {
    let errorMessage = `API Error (${response.status})`;
    
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      try {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      } catch {
        // ignore
      }
    }
    
    throw new Error(errorMessage); 
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return response.text() as unknown as T;
  }
};