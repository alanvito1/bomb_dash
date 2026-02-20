require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function initSupabase() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            persistSession: false,
          },
        }
      );
      console.log('Supabase initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
    }
  } else {
    console.warn(
      'Supabase credentials missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Realtime features will be disabled.'
    );
  }
}

async function broadcastMessage(messageType, payload) {
  if (!supabase) return;

  try {
    const channel = supabase.channel('global-chat');
    await channel.send({
      type: 'broadcast',
      event: messageType, // e.g., 'system-message', 'chat-message'
      payload: payload,
    });
    // Cleanup channel subscription if it was temporary,
    // but for global chat we might keep a persistent connection or rely on REST API if available for broadcasting.
    // However, server-side broadcast via supabase-js is usually done via triggers or REST.
    // The `channel.send` method works if the client is connected.
    // For server-side, it's better to use Realtime Broadcast via REST if possible,
    // but the JS client simplifies this. We just need to ensure the channel is joined.
    // A better approach for server-side is to just let the client handle it?
    // No, server needs to broadcast system events (e.g. "Player dropped item").

    // In a server environment, maintaining a socket connection for broadcast is fine.
    // But since this function might be called sporadically, we should ensure we are connected.
    // Actually, `channel.send` returns a promise.

    // NOTE: The standard way to broadcast from server is to just use the client.
    // We might need to subscribe once at startup if we want to listen,
    // but for sending, we create the channel and send.

    // Optimisation: reuse channel if possible, or create/destroy.
    // For now, let's try sending directly.
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
}

// Better implementation: Maintain a single channel instance for the server
let globalChannel = null;

async function sendSystemMessage(text) {
  if (!supabase) return;

  if (!globalChannel) {
    globalChannel = supabase.channel('global-chat');
    await globalChannel.subscribe();
  }

  // Wait for subscription? The subscribe() is async but returns status.
  // We can just send.

  await globalChannel.send({
    type: 'broadcast',
    event: 'system-message',
    payload: { message: text, timestamp: new Date().toISOString() },
  });
}

module.exports = {
  initSupabase,
  broadcastMessage,
  sendSystemMessage,
  getSupabase: () => supabase,
};
