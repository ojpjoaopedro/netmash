import Stripe from "stripe";

const liveKey = process.env.STRIPE_SECRET_KEY;       // produção (sk_live_…)
const testKey = process.env.STRIPE_SECRET_KEY_TEST;  // teste (sk_test_…) — opcional

/** true quando pelo menos uma chave secreta da Stripe está configurada. */
export const stripeReady = Boolean(liveKey || testKey);

/** Cliente Stripe de PRODUÇÃO. null se a chave não estiver configurada. */
export const stripe = liveKey ? new Stripe(liveKey) : null;

/** Cliente Stripe de TESTE. null se a chave de teste não estiver configurada. */
export const stripeTest = testKey ? new Stripe(testKey) : null;
