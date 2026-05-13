const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { stripe, priceId, webhookSecret, isConfigured } = require('../lib/stripe');

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/payments/status
router.get('/status', requireAuth, (req, res) => {
  res.json({
    isPremium: Boolean(req.user.isPremium),
    premiumSince: req.user.premiumSince,
    promoCodeUsed: req.user.promoCodeUsed,
  });
});

// POST /api/payments/checkout — crea Stripe Checkout Session
router.post('/checkout', requireAuth, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Pagamenti non configurati' });
  }
  if (req.user.isPremium) {
    return res.status(400).json({ error: 'Già premium' });
  }

  const rawCode = (req.body?.promoCode || '').trim().toUpperCase();
  let discounts;
  let promoCodeApplied = null;

  if (rawCode) {
    const promo = await prisma.promoCode.findUnique({ where: { code: rawCode } });
    if (!promo || !promo.active) {
      return res.status(400).json({ error: 'Codice promozionale non valido' });
    }
    try {
      const coupon = await stripe.coupons.create({
        percent_off: promo.discountPct,
        duration: 'once',
        name: `QuitFresh ${promo.code}`,
      });
      discounts = [{ coupon: coupon.id }];
      promoCodeApplied = promo.code;
    } catch (err) {
      console.error('Stripe coupon error:', err);
      return res.status(502).json({ error: 'Impossibile applicare lo sconto' });
    }
  }

  const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  const basePath = process.env.CLIENT_BASE_PATH || '/quitfresh';

  try {
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(discounts && { discounts }),
      success_url: `${clientUrl}${basePath}/premium-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}${basePath}/craving`,
      metadata: {
        userId: req.user.id,
        promoCode: promoCodeApplied || '',
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(502).json({ error: 'Impossibile avviare il pagamento' });
  }
});

// POST /api/payments/webhook — Stripe inviare eventi qui (raw body)
router.post('/webhook', async (req, res) => {
  if (!isConfigured() || !webhookSecret) {
    return res.status(503).send('Webhook non configurato');
  }

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const promoCode = session.metadata?.promoCode || null;

    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            isPremium: true,
            premiumSince: new Date(),
            promoCodeUsed: promoCode || undefined,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
          },
        });

        if (promoCode) {
          await prisma.promoCode.update({
            where: { code: promoCode },
            data: { usageCount: { increment: 1 } },
          }).catch(() => {});
        }

        console.log(`[payments] Premium attivato per user ${userId}${promoCode ? ` (codice ${promoCode})` : ''}`);
      } catch (err) {
        console.error('Premium update error:', err);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
