import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
    try {
        const payload = await req.json();
        
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

        // Figure out notification body from message type
        let bodyText = "New Message";
        const msgType = record.message_type || 'text';
        if (msgType === 'text') {
            // Message is encrypted — show generic but friendly text
            bodyText = "📩 Sent you a message";
        } else if (msgType === 'image' || record.file_type?.startsWith('image/')) {
            bodyText = "📷 Sent you a photo";
        } else if (msgType === 'voice' || record.file_type?.startsWith('audio/')) {
            bodyText = "🎤 Sent you a voice message";
        } else if (msgType === 'video' || record.file_type?.startsWith('video/')) {
            bodyText = "🎥 Sent you a video";
        } else if (msgType === 'document') {
            bodyText = "📄 Sent you a document";
        } else if (msgType === 'ledger') {
            bodyText = "💰 Sent you a payment request";
        } else {
            bodyText = "📩 Sent you a message";
        }

        let pushTokens: string[] = [];
        let title = senderName;
        let body = bodyText;

        // Private message
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
        // Group message
        else if (groupId) {
            const { data: groupData } = await supabase
                .from('groups')
                .select('name')
                .eq('id', groupId)
                .maybeSingle();
                
            title = `${senderName}`;
            body = `${groupData?.name || 'Group'}: ${bodyText}`;

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
                            .filter(token => token !== null && token !== undefined);
                    }
                }
            }
        }

        if (pushTokens.length === 0) {
            return new Response(JSON.stringify({ message: "No push tokens found" }), { status: 200 });
        }

        console.log(`Sending notification to ${pushTokens.length} devices. Title: ${title}`);

        // ✅ FIXED: title & body at ROOT level so phone shows banner when app is closed
        const messages = pushTokens.map(token => ({
            to: token,
            title: title,
            body: body,
            sound: 'default',
            priority: 'high',
            channelId: 'default',
            data: { 
                title: title,
                body: body,
                senderAvatar: senderProfile?.avatar_url || '',
                senderId: groupId ? groupId : senderId,
                messageId: record.id,
                type: 'message'
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
        console.log("Expo push result:", JSON.stringify(result));
        
        // Mark message as delivered
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
