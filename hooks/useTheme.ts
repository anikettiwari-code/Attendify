import { useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';

export function useTheme() {
    const systemColorScheme = useColorScheme();
    const [mode, setMode] = useState<'light' | 'dark'>(systemColorScheme || 'light');

    const toggleTheme = useCallback(() => {
        setMode(prev => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    return {
        mode,
        isDark: mode === 'dark',
        toggleTheme,
    };
}
