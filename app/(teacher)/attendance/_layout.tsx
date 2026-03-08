import { Stack } from 'expo-router';
import { COLORS } from '../../../lib/theme';

export default function AttendanceLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.background },
                animation: 'slide_from_right',
            }}
        />
    );
}
