const Stripe = require('stripe');

const secret = (process.env.STRIPE_SECRET_KEY || '').trim();
const priceId = (process.env.STRIPE_PRICE_ID || '').trim();
const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

let stripe = null;
if (secret) {
  stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
}

function isConfigured() {
  return Boolean(stripe && priceId);
}

module.exports = { stripe, priceId, webhookSecret, isConfigured };
