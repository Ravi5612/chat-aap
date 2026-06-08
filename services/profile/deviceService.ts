import { supabase } from '@/lib/supabase';
import { AppStorage } from '@/lib/storage';

export const getLinkedDevices = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_active', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const logoutDevice = async (deviceId: string) => {
    const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('id', deviceId);
    
    if (error) throw error;
};

export const getCurrentDeviceId = async () => {
    return await AppStorage.getItemAsync('unique_device_id');
};
