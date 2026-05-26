import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
    try {
        const payload = await req.json();
        
        // Check if it's a webhook record
        const record = payload.record;
        if (!record) {
            return new Response(JSON.stringify({ error: "No record found" }), { status: 400 });
        }

        const senderId = record.sender_id;
        const receiverId = record.receiver_id;
        const groupId = record.group_id;

        if (!senderId) {
            return new Response(JSON.stringify({ error: "No sender found" }), { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Fetch sender details
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', senderId)
            .maybeSingle();

        const senderName = senderProfile?.username || "Someone";

        let pushTokens = [];
        let title = senderName;
        let body = "New Message";

        // If it's a private message
        if (receiverId) {
            const { data: receiverProfile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('id', receiverId)
                .maybeSingle();

            if (receiverProfile?.push_token) {
                pushTokens.push(receiverProfile.push_token);
            }
        } 
        // If it's a group message
        else if (groupId) {
            // Fetch group name
            const { data: groupData } = await supabase
                .from('groups')
                .select('name')
                .eq('id', groupId)
                .maybeSingle();
                
            title = `${senderName} in ${groupData?.name || 'Group'}`;

            // Fetch all group members EXCEPT the sender
            const { data: groupMembers } = await supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', groupId);

            if (groupMembers && groupMembers.length > 0) {
                const memberIds = groupMembers.map(m => m.user_id).filter(id => id !== senderId);
                
                if (memberIds.length > 0) {
                    const { data: memberProfiles } = await supabase
                        .from('profiles')
                        .select('push_token')
                        .in('id', memberIds);
                        
                    if (memberProfiles) {
                        pushTokens = memberProfiles
                            .map(p => p.push_token)
                            .filter(token => token !== null);
                    }
                }
            }
        }

        if (pushTokens.length === 0) {
            return new Response(JSON.stringify({ message: "No push tokens found" }), { status: 200 });
        }

        console.log(`Sending notification to ${pushTokens.length} devices.`);

        // Expo push payload
        const messages = pushTokens.map(token => ({
            to: token,
            // Omit root 'title' and 'body' to make it a data-only notification for FCM, 
            // so we don't get duplicate notifications when Notifee handles it.
            data: { 
                title: title,
                body: body,
                senderAvatar: senderProfile?.avatar_url || '',
                senderId: groupId ? groupId : senderId, // Route to group or friend
                messageId: record.id,
                type: 'message'
            },
            priority: 'high',
        }));

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        
        // Mark message as delivered for the receiver (optional, since global realtime might handle it)
        // Only mark if it's a private message for now
        if (receiverId) {
            await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('id', record.id)
                .eq('status', 'sent');
        }

        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        console.error("Error sending push:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
