// Public VAPID key — safe to ship in the client bundle (that's the whole
// point of the "public" half of a VAPID keypair). The matching private key
// never appears in this repo; it lives only as a Supabase Edge Function
// secret (VAPID_PRIVATE_KEY), read via Deno.env.get() in
// supabase/functions/dynamic-endpoint/index.ts's sendWebPush().
export const VAPID_PUBLIC_KEY = "BMZn_STDNSNuBUJRwHtLMyUj16ZXCCbKVJ_RaJJ5LjG63Mr72jLASUSAygOH673H4TrMoU2s6FJrFMBl-aI8E6Y"
