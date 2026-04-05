import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export class Storage {
  async getUserByClerkId(clerkUserId: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));
    return user || null;
  }

  async updateUserStripeInfo(
    clerkUserId: string,
    stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string; plan?: string }
  ) {
    const [user] = await db
      .update(usersTable)
      .set(stripeInfo)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .returning();
    return user;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getSubscriptionByCustomerId(customerId: string) {
    const result = await db.execute(
      sql`
        SELECT
          s.id,
          s.status,
          s.current_period_start,
          s.current_period_end,
          s.cancel_at_period_end,
          p.name AS product_name,
          p.metadata AS product_metadata,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.id AS price_id
        FROM stripe.subscriptions s
        LEFT JOIN stripe.subscription_items si ON si.subscription = s.id
        LEFT JOIN stripe.prices pr ON pr.id = si.price
        LEFT JOIN stripe.products p ON p.id = pr.product
        WHERE s.customer = ${customerId}
          AND s.status IN ('active', 'trialing', 'past_due')
        ORDER BY s.created DESC
        LIMIT 1
      `
    );
    return result.rows[0] || null;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
          ORDER BY id
        )
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.description AS product_description,
          p.active AS product_active,
          p.metadata AS product_metadata,
          pr.id AS price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active AS price_active
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY pr.unit_amount ASC
      `
    );
    return result.rows;
  }
}

export const storage = new Storage();
