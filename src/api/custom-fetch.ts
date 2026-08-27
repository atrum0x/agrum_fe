export const customFetch = async <T>(
  url: string,                     
  options?: RequestInit            
): Promise<T> => {
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const response = await fetch(fullUrl, {
    ...options,                    // Spreads method, body, headers, etc.
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',          // Keeps your HttpOnly cookies working!
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