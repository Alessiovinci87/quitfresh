const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { stripe, priceId, webhookSecret, isConfigured } = require('../lib/stripe');

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
// Caso speciale: codice promo al 100% → bypass Stripe, attivazione diretta.
router.post('/checkout', requireAuth, async (req, res) => {
  if (req.user.isPremium) {
    return res.status(400).json({ error: 'Già premium' });
  }

  const rawCode = (req.body?.promoCode || '').trim().toUpperCase();
  let promo = null;

  if (rawCode) {
    promo = await prisma.promoCode.findUnique({ where: { code: rawCode } });
    if (!promo || !promo.active) {
      return res.status(400).json({ error: 'Codice promozionale non valido' });
    }
    if (promo.maxUses != null && promo.usageCount >= promo.maxUses) {
      return res.status(400).json({ error: 'Codice esaurito' });
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Codice scaduto' });
    }

    // 100% di sconto → niente Stripe, attivazione gratuita immediata.
    if (promo.discountPct >= 100) {
      try {
        // RACE CONDITION FIX: increment ATOMIC con condizione WHERE che
        // garantisce usageCount < maxUses al momento dell'update. Se 0
        // righe aggiornate, due richieste concorrenti hanno consumato
        // l'ultima quota disponibile → rifiutiamo.
        const consumed = await prisma.$executeRaw`
          UPDATE "PromoCode"
          SET "usageCount" = "usageCount" + 1
          WHERE "id" = ${promo.id}
          AND ("maxUses" IS NULL OR "usageCount" < "maxUses")
        `;
        if (consumed === 0) {
          return res.status(400).json({ error: 'Codice esaurito' });
        }
        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            isPremium: true,
            premiumSince: new Date(),
            promoCodeUsed: promo.code,
          },
        });
        return res.json({ url: null, freeActivated: true });
      } catch (err) {
        console.error('Free activation error:', err);
        return res.status(500).json({ error: 'Errore durante l\'attivazione' });
      }
    }
  }

  // Da qui in poi serve Stripe (sconto parziale o nessuno sconto).
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Pagamenti non configurati' });
  }

  let discounts;
  let promoCodeApplied = null;
  if (promo) {
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
      cancel_url: `${clientUrl}${basePath}/paywall`,
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
        // IDEMPOTENCY: Stripe puo' inviare lo stesso evento piu' volte
        // (es. retry su 5xx). Se l'utente e' gia' premium, l'evento e'
        // gia' stato processato → skip silenzioso.
        const existing = await prisma.user.findUnique({
          where: { id: userId },
          select: { isPremium: true },
        });
        if (existing?.isPremium) {
          console.log(`[payments] Webhook duplicato ignorato per user ${userId}`);
          return res.json({ received: true, alreadyProcessed: true });
        }

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
          // RACE CONDITION FIX: increment ATOMIC con WHERE che blocca
          // overage del codice (idem 100% activation sopra).
          await prisma.$executeRaw`
            UPDATE "PromoCode"
            SET "usageCount" = "usageCount" + 1
            WHERE "code" = ${promoCode}
            AND ("maxUses" IS NULL OR "usageCount" < "maxUses")
          `.catch(() => {});
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
