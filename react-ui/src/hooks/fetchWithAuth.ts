// src/utils/fetchWithAuth.ts
interface FetchOptions extends RequestInit {
    timeout?: number;
  }
  
  export const fetchWithAuth = async (
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> => {
    const token = localStorage.getItem('jwtToken');
    const headers = new Headers(options.headers);
  
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  
    // Add timeout support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 8000);
  
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
  
      if (response.status === 401 && !url.includes('/login')) {
        localStorage.removeItem('jwtToken');
        window.location.href = '/login';
      }
  
      if (!response.ok) {
        throw new Error(`${await response.text()}`);
      }
  
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };