import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

/** true quando a chave secreta da Stripe está configurada no servidor. */
export const stripeReady = Boolean(key);

/** Cliente Stripe (servidor). null se a chave não estiver configurada. */
export const stripe = key ? new Stripe(key) : null;
