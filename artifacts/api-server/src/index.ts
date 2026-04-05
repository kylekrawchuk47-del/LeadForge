import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    const { getStripeSync } = await import("./stripeClient");

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn("DATABASE_URL not set — skipping Stripe initialization");
      return;
    }

    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl, schema: "stripe" });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    logger.info({ webhookBaseUrl }, "Setting up managed webhook...");
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err: Error) => logger.error({ err }, "Stripe backfill error"));
  } catch (err: any) {
    if (err.message?.includes("not connected") || err.message?.includes("not yet connected")) {
      logger.warn("Stripe integration not yet connected — billing features unavailable until connected");
    } else if (err.code === "MODULE_NOT_FOUND" || err.message?.includes("Cannot find module")) {
      logger.warn("stripe-replit-sync not installed — skipping Stripe initialization");
    } else {
      logger.error({ err }, "Stripe initialization failed");
    }
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
