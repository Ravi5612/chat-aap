import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useStatusViewers(currentStatus: any, currentUser: any, isOwner: boolean) {
    const [statusViewers, setStatusViewers] = useState<any[]>([]);

    const fetchViewers = useCallback(async (statusId: string) => {
        if (!statusId) return;
        try {
            const { data: views, error } = await supabase
                .from('status_views')
                .select('viewed_at, viewer_id')
                .eq('status_id', statusId)
                .order('viewed_at', { ascending: false });

            if (error) throw error;
            if (views && views.length > 0) {
                const viewerIds = views.map(v => v.viewer_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', viewerIds);

                const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {}) || {};
                const combined = views.map(v => {
                    const profile = profileMap[v.viewer_id];
                    return {
                        ...(profile || { id: v.viewer_id, username: 'Unknown User' }),
                        viewed_at: v.viewed_at,
                        profiles: profile
                    };
                });
                setStatusViewers(combined);
            } else {
                setStatusViewers([]);
            }
        } catch (error) {
            console.error("Error fetching viewers:", error);
            setStatusViewers([]);
        }
    }, []);

    useEffect(() => {
        if (!currentStatus || !currentUser) return;

        if (!isOwner) {
            supabase.from('status_views').upsert([{
                status_id: currentStatus.id,
                viewer_id: currentUser.id
            }], { onConflict: 'status_id,viewer_id' }).then(({ error }) => {
                if (error && error.code !== '23505') console.error('Error reporting view:', error);
            });
        }

        if (isOwner) {
            fetchViewers(currentStatus.id);
        }
    }, [currentStatus, currentUser, isOwner, fetchViewers]);

    useEffect(() => {
        if (!currentStatus?.id || !isOwner) return;

        const channel = supabase
            .channel(`status_views_${currentStatus.id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'status_views', filter: `status_id=eq.${currentStatus.id}` },
                () => fetchViewers(currentStatus.id)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStatus?.id, isOwner, fetchViewers]);

    return { statusViewers, fetchViewers };
}
