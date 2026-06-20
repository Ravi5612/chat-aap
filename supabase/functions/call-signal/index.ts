import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { JWT } from "npm:google-auth-library@9.6.3";
import serviceAccount from "./firebase-service-account.json" assert { type: "json" };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/firebase.messaging'],
      null
    );
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { recipient_id, caller_name, channel_name, caller_id } = payload;

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
      .select('fcm_token, push_token')
      .eq('id', recipient_id)
      .single();

    if (userError || (!userData?.fcm_token && !userData?.push_token)) {
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

    const fcmToken = userData.fcm_token || userData.push_token;

    // Direct FCM HTTP v1 API payload
    const fcmMessage = {
      message: {
        token: fcmToken,
        data: {
          type: "call_signal",
          callerName: caller_name || "Someone",
          callerAvatar: callerAvatar,
          channelName: channel_name,
          callerId: String(caller_id)
        },
        android: {
          priority: "high"
        },
        apns: {
          payload: {
            aps: {
              "content-available": 1
            }
          }
        }
      }
    };

    const accessToken = await getAccessToken();

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fcmMessage),
    });

    const responseData = await response.json();

    if (responseData.error) {
      console.error("FCM Push Error:", responseData);
      throw new Error(`Push sending failed: ${JSON.stringify(responseData.error)}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Call signal sent directly via FCM" }), {
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
