import { createClient } from './supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pesaki-server.onrender.com';

export async function apiServerRequest(path: string, options: RequestInit = {}) {
    const supabase = await createClient();
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Fallback: try to refresh session if not found
    if (!session) {
        console.warn('Session not immediately found, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshedSession) {
            session = refreshedSession;
            console.info('Session successfully refreshed');
        } else if (refreshError) {
            console.error('Session refresh failed:', refreshError.message);
        }
    }

    const headers = new Headers(options.headers);
    const token = session?.access_token;
    
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        console.info('API Server Request - Token attached');
    } else {
        console.warn('API Server Request - NO TOKEN AVAILABLE');
    }
    headers.set('Content-Type', 'application/json');

    const fetchUrl = path.startsWith('http') ? path : `${API_URL}${path}`;
    console.info('API Server Request - fetchUrl', fetchUrl, 'method', options.method || 'GET');

    const response = await fetch(fetchUrl, {
        ...options,
        headers,
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const error = await response.json();
            errorMsg = error.error || error.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
    }

    return response.json();
}
