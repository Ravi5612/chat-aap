import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { JWT } from "npm:google-auth-library@9.6.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { recipient_id, caller_name, channel_name } = payload;

    if (!recipient_id || !channel_name) {
      throw new Error("Missing parameters");
    }

    // Connect to Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the FCM token and caller info
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('push_token')
      .eq('id', recipient_id)
      .single();

    if (userError || !userData?.push_token) {
      throw new Error("Recipient FCM token not found");
    }

    // Try to get caller avatar
    let callerAvatar = "";
    if (caller_name) {
      const { data: callerData } = await supabaseClient
        .from('profiles')
        .select('avatar_url')
        .eq('username', caller_name)
        .maybeSingle();
      
      if (callerData?.avatar_url) {
        callerAvatar = callerData.avatar_url;
      }
    }

    const fcmToken = userData.push_token;

    const expoPayload = {
      to: fcmToken,
      data: {
        type: "call_signal",
        callerName: caller_name || "Someone",
        callerAvatar: callerAvatar,
        channelName: channel_name
      },
      priority: 'high'
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expoPayload),
    });

    const responseData = await response.json();

    if (responseData.data?.status === 'error') {
      console.error("Expo Push Error:", responseData);
      throw new Error(`Push sending failed: ${JSON.stringify(responseData)}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Call signal sent" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
