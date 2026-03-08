import { API_CONFIG } from './constants';

export const api = {
    async post(endpoint: string, data: any) {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.detail || 'API request failed');
        }

        return response.json();
    },

    async get(endpoint: string) {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.detail || 'API request failed');
        }

        return response.json();
    },
};
