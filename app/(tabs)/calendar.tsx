import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function CalendarTabRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const openAddPicker = params.openAddPicker;
    const query = openAddPicker ? `?openAddPicker=${openAddPicker}` : '';
    router.replace((`/calendar${query}`) as any);
  }, [params.openAddPicker, router]);

  return null;
}
