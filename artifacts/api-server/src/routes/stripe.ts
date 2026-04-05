import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { storage } from "../storage";
import { stripeService } from "../stripeService";
import { clerkClient } from "@clerk/express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/stripe/subscription", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = await storage.getUserByClerkId(req.userId!);
    if (!user) {
      res.json({ subscription: null, plan: "free" });
      return;
    }

    if (!user.stripeCustomerId) {
      res.json({ subscription: null, plan: user.plan || "free" });
      return;
    }

    const subscription = await storage.getSubscriptionByCustomerId(user.stripeCustomerId);

    if (subscription && subscription.status === "active") {
      const productName = String(subscription.product_name || "");
      const plan = stripeService.planNameFromProductName(productName);

      if (user.plan !== plan) {
        await storage.updateUserStripeInfo(req.userId!, { plan });
      }

      res.json({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          priceId: subscription.price_id,
          unitAmount: subscription.unit_amount,
          currency: subscription.currency,
          productName: subscription.product_name,
        },
        plan,
      });
    } else {
      res.json({ subscription: null, plan: user.plan || "free" });
    }
  } catch (err: any) {
    logger.error({ err }, "Error fetching subscription");
    if (err.message?.includes("stripe") && err.message?.includes("not connected")) {
      res.json({ subscription: null, plan: "free", stripeNotConnected: true });
    } else {
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  }
});

router.post("/stripe/checkout", requireAuth, async (req, res): Promise<void> => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      res.status(400).json({ error: "priceId is required" });
      return;
    }

    let user = await storage.getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const clerkUser = await clerkClient.users.getUser(req.userId!);
      const email = clerkUser.primaryEmailAddress?.emailAddress || "";
      const customer = await stripeService.createCustomer(email, req.userId!);
      await storage.updateUserStripeInfo(req.userId!, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const session = await stripeService.createCheckoutSession(customerId, priceId);
    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "Error creating checkout session");
    if (err.message?.includes("not connected")) {
      res.status(503).json({ error: "Stripe is not connected. Please contact support." });
    } else {
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
});

router.post("/stripe/credits-checkout", requireAuth, async (req, res): Promise<void> => {
  try {
    const { pack } = req.body as { pack?: string };
    if (!["100", "300", "1000"].includes(pack ?? "")) {
      res.status(400).json({ error: "pack must be '100', '300', or '1000'" });
      return;
    }

    let user = await storage.getUserByClerkId(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const clerkUser = await clerkClient.users.getUser(req.userId!);
      const email = clerkUser.primaryEmailAddress?.emailAddress || "";
      const customer = await stripeService.createCustomer(email, req.userId!);
      await storage.updateUserStripeInfo(req.userId!, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const session = await stripeService.createCreditsCheckoutSession(
      customerId,
      pack as "100" | "300" | "1000",
      req.userId!
    );
    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "Error creating credits checkout session");
    if (err.message?.includes("not connected")) {
      res.status(503).json({ error: "Stripe is not connected. Please contact support." });
    } else {
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
});

router.post("/stripe/portal", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = await storage.getUserByClerkId(req.userId!);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer found. Subscribe to a plan first." });
      return;
    }

    const session = await stripeService.createPortalSession(user.stripeCustomerId);
    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "Error creating portal session");
    if (err.message?.includes("not connected")) {
      res.status(503).json({ error: "Stripe is not connected. Please contact support." });
    } else {
      res.status(500).json({ error: "Failed to open billing portal" });
    }
  }
});

router.get("/stripe/products", async (_req, res): Promise<void> => {
  try {
    const rows = await storage.listProductsWithPrices();
    const productsMap = new Map<string, any>();

    for (const row of rows) {
      const productId = String(row.product_id);
      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          id: productId,
          name: row.product_name,
          description: row.product_description,
          active: row.product_active,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(productId)!.prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (err: any) {
    logger.error({ err }, "Error fetching products");
    if (err.message?.includes("stripe") || err.message?.includes("not connected")) {
      res.json({ data: [], stripeNotConnected: true });
    } else {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }
});

export default router;
