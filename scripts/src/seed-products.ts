/**
 * LeadForge — Stripe Product Seeder
 *
 * Creates Free, Pro, and Agency subscription plans in Stripe.
 * This script is idempotent — safe to run multiple times.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */
import { getUncachableStripeClient } from "./stripeClient";

const PLANS = [
  {
    name: "Free Plan",
    description: "Basic access with 10 ad generations per month.",
    prices: [{ amount: 0, interval: "month" as const }],
    metadata: { plan: "free" },
  },
  {
    name: "Pro Plan",
    description: "Unlimited generations, all platforms, priority support.",
    prices: [
      { amount: 2900, interval: "month" as const },
      { amount: 29000, interval: "year" as const },
    ],
    metadata: { plan: "pro" },
  },
  {
    name: "Agency Plan",
    description: "Multi-client, white-label, dedicated account manager.",
    prices: [
      { amount: 7900, interval: "month" as const },
      { amount: 79000, interval: "year" as const },
    ],
    metadata: { plan: "agency" },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("🔍 Checking existing LeadForge products in Stripe...\n");

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ ${plan.name} already exists (${existing.data[0].id}) — skipping`);
      continue;
    }

    console.log(`Creating ${plan.name}...`);
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });
    console.log(`  ✓ Product created: ${product.id}`);

    for (const price of plan.prices) {
      if (price.amount === 0) {
        console.log(`  Skipping $0 price for Free Plan (use Stripe free tier or trial)`);
        continue;
      }
      const created = await stripe.prices.create({
        product: product.id,
        unit_amount: price.amount,
        currency: "usd",
        recurring: { interval: price.interval },
        metadata: plan.metadata,
      });
      console.log(
        `  ✓ Price: $${(price.amount / 100).toFixed(2)}/${price.interval} (${created.id})`
      );
    }
    console.log("");
  }

  console.log("✅ LeadForge products seeded successfully!");
  console.log("   Webhooks will sync this data to your local database automatically.");
}

seedProducts().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
