import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    themeMode: ThemeMode;
    colorScheme: 'light' | 'dark';
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const nativeColorScheme = useNativeColorScheme();
    const { setColorScheme: setNativeWindColorScheme } = useNativeWindColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    
    // Resolve the actual color scheme based on user preference or system
    const colorScheme = themeMode === 'system' ? (nativeColorScheme ?? 'light') : themeMode;

    useEffect(() => {
        // Load saved preference
        AsyncStorage.getItem('theme-mode').then((savedMode) => {
            if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
                setThemeModeState(savedMode);
            }
        });
    }, []);

    useEffect(() => {
        // Apply to NativeWind if using tailwind classes
        setNativeWindColorScheme(colorScheme);
    }, [colorScheme, setNativeWindColorScheme]);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        await AsyncStorage.setItem('theme-mode', mode);
    };

    return (
        <ThemeContext.Provider value={{ themeMode, colorScheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
