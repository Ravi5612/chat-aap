import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

serve(async (req) => {
  try {
    const { record } = await req.json()
    const receiverId = record.receiver_id || record.friend_id // Handle both messages and call invites
    
    // Supabase client initialize karein
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Receiver ka push_token fetch karein
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, username')
      .eq('id', receiverId)
      .single()

    // Sender ka naam fetch karein
    const { data: sender } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', record.sender_id)
      .single()

    if (profile?.push_token) {
      console.log(`Sending notification to ${profile.username} (${profile.push_token})`)
      
      // Expo Push API ko call karein
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: profile.push_token,
          title: sender?.username || 'ChatWarriors',
          body: record.message ? 'New Message' : 'Incoming Call...',
          data: { 
            senderId: record.sender_id, 
            type: record.message ? 'message' : 'call',
            name: sender?.username,
            image: sender?.avatar_url
          },
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        }),
      })

      const result = await response.json()
      return new Response(JSON.stringify(result), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('No push token found for user', { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
