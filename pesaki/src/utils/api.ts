import { createClient as createBrowserClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiRequest(path: string, options: RequestInit = {}) {
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('Authentication required. Please log in to continue.');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('Content-Type', 'application/json');

    const fetchUrl = (path.startsWith('http') || path.startsWith('/api/')) ? path : `${API_URL}${path}`;

    const response = await fetch(fetchUrl, {
        ...options,
        headers,
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const error = await response.json();
            // Look for 'error' or 'message' in the JSON body
            errorMsg = error.error || error.message || errorMsg;
        } catch (e) {
            // If not JSON, try text
            try {
                const text = await response.text();
                if (text) errorMsg = text;
            } catch (innerE) {}
        }
        throw new Error(errorMsg);
    }

    return response.json();
}
