import { demoUsersFixtureSchema, type DemoUsersFixture } from "@meridian/schemas";

export function parseDemoUsersJson(raw: unknown): DemoUsersFixture {
  const fixture = demoUsersFixtureSchema.parse(raw);
  const emails = new Set<string>();
  for (const user of fixture.users) {
    if (emails.has(user.email)) {
      throw new Error(`DUPLICATE_DEMO_EMAIL:${user.email}`);
    }
    emails.add(user.email);
  }
  for (const email of Object.keys(fixture.portfolios)) {
    if (!emails.has(email)) {
      throw new Error(`ORPHAN_DEMO_PORTFOLIO:${email}`);
    }
  }
  return fixture;
}

export function traderPortfolio(fixture: DemoUsersFixture) {
  const trader = fixture.users.find((row) => row.email.startsWith("demo.trader@"));
  if (!trader) {
    throw new Error("DEMO_TRADER_MISSING");
  }
  const portfolio = fixture.portfolios[trader.email];
  if (!portfolio) {
    throw new Error("DEMO_TRADER_PORTFOLIO_MISSING");
  }
  return { trader, portfolio };
}
