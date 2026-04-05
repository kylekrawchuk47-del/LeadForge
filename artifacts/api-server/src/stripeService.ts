import { getUncachableStripeClient } from "./stripeClient";

const PLAN_NAMES: Record<string, string> = {
  "Free Plan": "free",
  "Pro Plan": "pro",
  "Agency Plan": "agency",
};

export class StripeService {
  async createCustomer(email: string, clerkUserId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { clerkUserId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string) {
    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}/localad-ai` : "http://localhost:5173";

    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/billing?checkout=success`,
      cancel_url: `${baseUrl}/billing?checkout=cancel`,
    });
  }

  async createCreditsCheckoutSession(
    customerId: string,
    pack: "100" | "300" | "1000",
    clerkUserId: string
  ) {
    const CREDIT_PACKS: Record<string, { amount: number; credits: number; name: string }> = {
      "100": { amount: 1500, credits: 100, name: "100 Generation Credits" },
      "300": { amount: 3900, credits: 300, name: "300 Generation Credits" },
      "1000": { amount: 9900, credits: 1000, name: "1,000 Generation Credits" },
    };

    const chosen = CREDIT_PACKS[pack];
    if (!chosen) throw new Error(`Invalid credit pack: ${pack}`);

    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}/localad-ai` : "http://localhost:5173";

    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: chosen.amount,
            product_data: {
              name: chosen.name,
              description: `LeadForge generation credits — use to create campaigns, emails, landing pages, and more.`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/billing?checkout=credits-success`,
      cancel_url: `${baseUrl}/billing?checkout=cancel`,
      metadata: {
        clerkUserId,
        creditsAmount: String(chosen.credits),
      },
    });
  }

  async createPortalSession(customerId: string) {
    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const returnUrl = domain
      ? `https://${domain}/localad-ai/billing`
      : "http://localhost:5173/billing";

    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  planNameFromProductName(productName: string): string {
    return PLAN_NAMES[productName] || "free";
  }
}

export const stripeService = new StripeService();
