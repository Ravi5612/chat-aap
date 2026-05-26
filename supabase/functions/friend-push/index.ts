import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
    try {
        const payload = await req.json();
        const record = payload.record;
        
        if (!record) {
            return new Response(JSON.stringify({ error: "No record found" }), { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let title = "Friend Request";
        let body = "";
        let pushTokens: string[] = [];
        let targetUserId = "";

        // Determine if it's a new request or an accepted request
        if (payload.type === 'INSERT' && record.status === 'pending') {
            // New friend request sent TO receiver_id BY sender_id
            targetUserId = record.receiver_id;
            const { data: sender } = await supabase.from('profiles').select('username').eq('id', record.sender_id).maybeSingle();
            const senderName = sender?.username || "Someone";
            
            title = "New Friend Request";
            body = `👤 ${senderName} sent you a friend request.`;
            
        } else if (payload.type === 'UPDATE' && record.status === 'accepted' && payload.old_record?.status === 'pending') {
            // Friend request accepted BY receiver_id FOR sender_id
            targetUserId = record.sender_id;
            const { data: receiver } = await supabase.from('profiles').select('username').eq('id', record.receiver_id).maybeSingle();
            const receiverName = receiver?.username || "Someone";
            
            title = "Friend Request Accepted";
            body = `✅ ${receiverName} accepted your friend request!`;
        } else {
            // Not a relevant event (e.g., declined or just another update)
            return new Response(JSON.stringify({ message: "Ignored event" }), { status: 200 });
        }

        if (targetUserId) {
            const { data: targetProfile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('id', targetUserId)
                .maybeSingle();

            if (targetProfile?.push_token) {
                pushTokens.push(targetProfile.push_token);
            }
        }

        if (pushTokens.length === 0) {
            return new Response(JSON.stringify({ message: "No push tokens found" }), { status: 200 });
        }

        const messages = pushTokens.map(token => ({
            to: token,
            title: title,
            body: body,
            sound: 'default',
            priority: 'high',
            channelId: 'default',
            data: { 
                type: 'friend_request',
                requestId: record.id
            },
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
        console.log("Friend Push Result:", JSON.stringify(result));
        
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (err) {
        console.error("Error sending push:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
