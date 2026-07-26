import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Polyfill WebSocket if missing on Node.js < 22 to prevent realtime initialization error
if (typeof globalThis.WebSocket === "undefined") {
  class DummyWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  }
  globalThis.WebSocket = DummyWebSocket;
}

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    disabled: true,
  },
});
