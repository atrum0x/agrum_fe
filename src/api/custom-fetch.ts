

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

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Keeps your HttpOnly cookies working!
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `API Error (${response.status})`);
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