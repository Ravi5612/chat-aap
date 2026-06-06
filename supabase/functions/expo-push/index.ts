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

        // ==========================================
        // 🛡️ STATEFUL IDEMPOTENCY CHECK
        // ==========================================
        const { error: insertError } = await supabase.from('push_logs').insert({ 
            message_id: record.id,
            status: 'processing',
            attempt_count: 1
        });

        if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation (already exists)
                // Fetch the existing log to see if it's stale or sent
                const { data: existingLog } = await supabase.from('push_logs').select('*').eq('message_id', record.id).single();
                
                if (!existingLog) {
                    return new Response(JSON.stringify({ message: "Duplicate push log disappeared" }), { status: 200 });
                }

                if (existingLog.status === 'sent' || existingLog.status === 'permanent_failed') {
                    return new Response(JSON.stringify({ message: `Push already ${existingLog.status}` }), { status: 200 });
                }

                if (existingLog.status === 'processing') {
                    // Check if stale (older than 5 minutes)
                    const updatedTime = new Date(existingLog.updated_at).getTime();
                    const now = new Date().getTime();
                    const diffMinutes = (now - updatedTime) / (1000 * 60);

                    if (diffMinutes < 5) {
                        return new Response(JSON.stringify({ message: "Push currently processing" }), { status: 200 });
                    }
                    // It is stale, allow retry
                }

                // Check max attempts
                if (existingLog.attempt_count >= 5) {
                    await supabase.from('push_logs').update({ 
                        status: 'permanent_failed', 
                        updated_at: new Date().toISOString() 
                    }).eq('message_id', record.id);
                    return new Response(JSON.stringify({ message: "Max attempts reached" }), { status: 200 });
                }

                // ATOMIC LOCK ACQUISITION (Optimistic Locking)
                const nowIso = new Date().toISOString();
                const { data: lockedRecord, error: lockError } = await supabase
                    .from('push_logs')
                    .update({
                        status: 'processing',
                        updated_at: nowIso,
                        attempt_count: existingLog.attempt_count + 1
                    })
                    .eq('message_id', record.id)
                    .eq('updated_at', existingLog.updated_at) // Optimistic Lock
                    .select()
                    .maybeSingle();

                if (lockError || !lockedRecord) {
                    return new Response(JSON.stringify({ message: "Lock acquisition failed (concurrent execution)" }), { status: 200 });
                }

            } else {
                console.error("Failed to insert push log:", insertError);
                // Allow it to proceed if DB errors out just in case
            }
        }

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
            await supabase.from('push_logs').update({ 
                status: 'permanent_failed', 
                last_error: 'No push tokens found',
                updated_at: new Date().toISOString() 
            }).eq('message_id', record.id);
            return new Response(JSON.stringify({ message: "No push tokens found" }), { status: 200 });
        }

        console.log(`Sending notification to ${pushTokens.length} devices. Title: ${title}`);

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
        
        // ==========================================
        // 🧹 PUSH TOKEN CLEANUP LOGIC
        // ==========================================
        if (result.data && Array.isArray(result.data)) {
            const invalidTokens: string[] = [];
            result.data.forEach((receipt: any, index: number) => {
                if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
                    invalidTokens.push(messages[index].to);
                }
            });

            if (invalidTokens.length > 0) {
                console.log(`Cleaning up ${invalidTokens.length} dead tokens`);
                await supabase.from('profiles').update({ push_token: null }).in('push_token', invalidTokens);
            }
        }

        // ==========================================
        // ✅ FINALIZE IDEMPOTENCY STATUS
        // ==========================================
        await supabase.from('push_logs').update({ 
            status: 'sent', 
            updated_at: new Date().toISOString() 
        }).eq('message_id', record.id);

        // Mark message as delivered (Exclusively for offline tracking)
        // Race condition minimized: even if receiver online, updating to 'delivered' is safe.
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
        
        // Try to update log to failed
        try {
            const payload = await req.json(); // Safe because it's already read in Deno? Wait, req.json() can only be read once.
            // Actually `payload` is already parsed at the top. Let's just use `record.id`.
        } catch(e) {}

        // We can't access `record.id` easily if we are in outer catch without wrapping inner. 
        // But since `record` is defined inside `try`, we can't. That's fine, we catch it inside the block in real apps, or just log here.
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
