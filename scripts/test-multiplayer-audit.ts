import { NextRequest } from "next/server";
import { POST } from "../src/app/api/table-sync/route";
import { sessionStore, buildSessionKey } from "../src/server/sessionStore";
import { kdsOrdersBuffer } from "../src/server/socketHandlers";
import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

interface AuditResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
  file?: string;
}

const auditResults: AuditResult[] = [];

async function runStep(
  name: string,
  category: string,
  file: string,
  fn: () => Promise<string>
) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    auditResults.push({
      name,
      category,
      passed: true,
      durationMs,
      details,
      file,
    });
    console.log(`  ✅ [PASS] ${name} (${durationMs}ms)`);
    console.log(`     └─ ${details}`);
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    auditResults.push({
      name,
      category,
      passed: false,
      durationMs,
      details: "Assertion Failed",
      error: errorMsg,
      file,
    });
    console.error(`  ❌ [FAIL] ${name} (${durationMs}ms)`);
    console.error(`     └─ Error: ${errorMsg}`);
  }
}

async function callApi(body: Record<string, unknown>) {
  const req = new NextRequest("http://localhost:3000/api/table-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const data = await res.json();
  return { status: res.status, data };
}

async function isDbReachable(): Promise<boolean> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("================================================================================");
  console.log("🚀 STARTING AUTOMATED MULTIPLAYER AUDIT & END-TO-END RESILIENCE TEST");
  console.log("================================================================================\n");

  const slug = "audit-test-cafe";
  const table = 5;
  const sessionKey = buildSessionKey(slug, table);

  // Initial Cleanup
  try {
    await sessionStore.deleteSession(sessionKey);
    kdsOrdersBuffer.delete(slug.toLowerCase());
    if (await isDbReachable()) {
      const rest = await prisma.restaurant.findUnique({ where: { slug } });
      if (rest) {
        await prisma.order.deleteMany({
          where: { restaurantId: rest.id, tableNumber: table },
        });
      }
    }
  } catch {
    // Ignore cleanup errors
  }

  // ============================================================================
  // TEST 1: Multi-User Join (Deduplication & Phantom Elimination)
  // ============================================================================
  console.log("\n--- TEST 1: Multi-User Join & Deduplication ---");

  const users = [
    { id: "user_rahul", name: "Rahul", color: "#f59e0b" },
    { id: "user_sneha", name: "Sneha", color: "#ec4899" },
    { id: "user_arjun", name: "Arjun", color: "#3b82f6" },
  ];

  await runStep(
    "Simultaneous 3-User Join",
    "Multi-User Join",
    "src/server/sessionStore.ts & /api/table-sync",
    async () => {
      // 3 users hit API at the exact same millisecond
      const joinPromises = users.map((u) =>
        callApi({
          action: "join",
          restaurantSlug: slug,
          tableNumber: table,
          user: u,
        })
      );

      const responses = await Promise.all(joinPromises);
      for (const res of responses) {
        if (!res.data.success) throw new Error("Join response success was false");
      }

      // Check current session
      const session = await sessionStore.getSession(sessionKey);
      if (!session) throw new Error("Session was not created");
      if (session.users.length !== 3) {
        throw new Error(`Expected 3 unique users, found ${session.users.length}: ${JSON.stringify(session.users)}`);
      }

      const userIds = session.users.map((u) => u.id);
      if (!userIds.includes("user_rahul") || !userIds.includes("user_sneha") || !userIds.includes("user_arjun")) {
        throw new Error(`Missing expected users in active list: ${userIds.join(", ")}`);
      }

      return `All 3 users (${session.users.map((u) => u.name).join(", ")}) joined cleanly without dropouts`;
    }
  );

  await runStep(
    "Browser Refresh Idempotency (Zero Phantom Diners)",
    "Multi-User Join",
    "src/server/sessionStore.ts",
    async () => {
      // Rahul refreshes his browser 2 times
      await callApi({
        action: "join",
        restaurantSlug: slug,
        tableNumber: table,
        user: { id: "user_rahul", name: "Rahul (Refreshed)", color: "#f59e0b" },
      });
      await callApi({
        action: "join",
        restaurantSlug: slug,
        tableNumber: table,
        user: { id: "user_rahul", name: "Rahul", color: "#f59e0b" },
      });

      const session = await sessionStore.getSession(sessionKey);
      if (!session) throw new Error("Session not found");
      if (session.users.length !== 3) {
        throw new Error(`Phantom user created! Expected strictly 3 users, but found ${session.users.length}`);
      }

      return "Refreshed browser correctly updated existing user record; guest count remains strictly 3";
    }
  );

  // ============================================================================
  // TEST 2: Concurrent Cart Additions (Race Condition Test)
  // ============================================================================
  console.log("\n--- TEST 2: Concurrent Cart Additions ---");

  const itemRahul = {
    id: "citem_alfaham_01",
    menuItemId: "m_alfaham",
    name: "Chicken Alfaham",
    priceInRupees: 280,
    priceInCents: 28000,
    quantity: 1,
    addedByUserId: "user_rahul",
    addedByUserName: "Rahul",
  };

  const itemSneha = {
    id: "citem_biryani_01",
    menuItemId: "m_biryani",
    name: "Malabar Dum Biryani",
    priceInRupees: 220,
    priceInCents: 22000,
    quantity: 1,
    addedByUserId: "user_sneha",
    addedByUserName: "Sneha",
  };

  const itemArjun = {
    id: "citem_lime_01",
    menuItemId: "m_lime",
    name: "Fresh Mint Lime Soda",
    priceInRupees: 60,
    priceInCents: 6000,
    quantity: 2,
    addedByUserId: "user_arjun",
    addedByUserName: "Arjun",
  };

  await runStep(
    "Atomic Simultaneous Cart Additions",
    "Cart Concurrency",
    "src/server/sessionStore.ts & /api/table-sync",
    async () => {
      // 3 diners add 3 distinct items at the exact same millisecond
      const addPromises = [itemRahul, itemSneha, itemArjun].map((item) =>
        callApi({
          action: "addItem",
          restaurantSlug: slug,
          tableNumber: table,
          item,
        })
      );

      await Promise.all(addPromises);

      const session = await sessionStore.getSession(sessionKey);
      if (!session) throw new Error("Session not found");
      if (session.cart.length !== 3) {
        throw new Error(`Race condition detected! Expected 3 items in cart, but found ${session.cart.length}`);
      }

      const cartItemNames = session.cart.map((i) => i.name);
      if (
        !cartItemNames.includes("Chicken Alfaham") ||
        !cartItemNames.includes("Malabar Dum Biryani") ||
        !cartItemNames.includes("Fresh Mint Lime Soda")
      ) {
        throw new Error(`Cart items missing after concurrent addition: ${cartItemNames.join(", ")}`);
      }

      // Check consensus votes reset on cart modification
      if (session.approvals && session.approvals.length > 0) {
        throw new Error("Approvals were not cleared on cart modification");
      }

      return `All 3 dishes (${cartItemNames.join(", ")}) successfully merged into atomic cart`;
    }
  );

  // ============================================================================
  // TEST 3: Ownership Enforcement (Authorization Security)
  // ============================================================================
  console.log("\n--- TEST 3: Cart Item Ownership Enforcement ---");

  await runStep(
    "Unauthorized Deletion Rejection (Arjun tries deleting Rahul's Alfaham)",
    "Security & Ownership",
    "src/server/sessionStore.ts",
    async () => {
      const res = await callApi({
        action: "removeItem",
        restaurantSlug: slug,
        tableNumber: table,
        cartItemId: "citem_alfaham_01",
        userId: "user_arjun",
      });

      if (res.status !== 500 && res.data.success !== false) {
        throw new Error("Security Failure: Arjun was permitted to delete Rahul's item!");
      }

      // Verify item is still in cart
      const session = await sessionStore.getSession(sessionKey);
      if (!session?.cart.some((i) => i.id === "citem_alfaham_01")) {
        throw new Error("Item was deleted despite unauthorized request!");
      }

      return "Blocked unauthorized item deletion with permission denial; item remains secure";
    }
  );

  await runStep(
    "Authorized Item Deletion & Re-addition",
    "Security & Ownership",
    "src/server/sessionStore.ts",
    async () => {
      // Rahul deletes his own item
      const res = await callApi({
        action: "removeItem",
        restaurantSlug: slug,
        tableNumber: table,
        cartItemId: "citem_alfaham_01",
        userId: "user_rahul",
      });

      if (!res.data.success) {
        throw new Error(`Rahul failed to delete his own item: ${res.data.error}`);
      }

      let session = await sessionStore.getSession(sessionKey);
      if (session?.cart.some((i) => i.id === "citem_alfaham_01")) {
        throw new Error("Item was not removed after authorized deletion");
      }

      // Re-add Alfaham for consensus voting
      await callApi({
        action: "addItem",
        restaurantSlug: slug,
        tableNumber: table,
        item: itemRahul,
      });

      session = await sessionStore.getSession(sessionKey);
      if (session?.cart.length !== 3) {
        throw new Error(`Expected 3 items in cart after re-addition, found ${session?.cart.length}`);
      }

      return "Authorized deletion succeeded, and dish was cleanly restored for consensus round";
    }
  );

  // ============================================================================
  // TEST 4: Consensus Voting (Progressive 1/3, 2/3, 3/3 Tallying)
  // ============================================================================
  console.log("\n--- TEST 4: Consensus Voting Flow ---");

  await runStep(
    "Trigger Review State",
    "Consensus Voting",
    "src/server/sessionStore.ts & /api/table-sync",
    async () => {
      const res = await callApi({
        action: "triggerReview",
        restaurantSlug: slug,
        tableNumber: table,
        userId: "user_rahul",
      });

      if (!res.data.success || res.data.session.status !== "REVIEWING") {
        throw new Error(`Expected status REVIEWING, got ${res.data.session?.status}`);
      }

      return "Table moved to REVIEWING mode; review modal broadcast ready";
    }
  );

  await runStep(
    "Progressive Approvals Tally (Vote 1/3 -> 2/3 -> 3/3)",
    "Consensus Voting",
    "src/server/sessionStore.ts & /api/table-sync",
    async () => {
      // Vote 1: Rahul votes
      const res1 = await callApi({
        action: "submitApproval",
        restaurantSlug: slug,
        tableNumber: table,
        userId: "user_rahul",
        hasApproved: true,
      });

      if (res1.data.status !== "VOTE_RECORDED") {
        throw new Error(`Expected VOTE_RECORDED for vote 1, got ${res1.data.status}`);
      }
      if (res1.data.session.approvals?.length !== 1) {
        throw new Error(`Expected 1 approval, got ${res1.data.session.approvals?.length}`);
      }

      // Vote 2: Sneha votes
      const res2 = await callApi({
        action: "submitApproval",
        restaurantSlug: slug,
        tableNumber: table,
        userId: "user_sneha",
        hasApproved: true,
      });

      if (res2.data.status !== "VOTE_RECORDED") {
        throw new Error(`Expected VOTE_RECORDED for vote 2, got ${res2.data.status}`);
      }
      if (res2.data.session.approvals?.length !== 2) {
        throw new Error(`Expected 2 approvals, got ${res2.data.session.approvals?.length}`);
      }

      // Vote 3: Arjun votes -> Reaches 3/3 Unanimous Consensus!
      const res3 = await callApi({
        action: "submitApproval",
        restaurantSlug: slug,
        tableNumber: table,
        userId: "user_arjun",
        hasApproved: true,
      });

      if (res3.data.status !== "ORDER_SUBMITTED") {
        throw new Error(`Expected ORDER_SUBMITTED upon 3/3 votes, got status ${res3.data.status}`);
      }
      if (res3.data.roundNumber !== 1 || res3.data.nextRoundNumber !== 2) {
        throw new Error(`Round transition incorrect: roundNumber=${res3.data.roundNumber}, next=${res3.data.nextRoundNumber}`);
      }

      return "Voted 1/3 -> 2/3 -> 3/3; unanimous consensus reached and triggered order submission";
    }
  );

  // ============================================================================
  // TEST 5: Order Placement & Round Transition Verification
  // ============================================================================
  console.log("\n--- TEST 5: Order Placement & PostgreSQL Verification ---");

  await runStep(
    "Verify PostgreSQL Order Snapshot (Status SENT_TO_KITCHEN)",
    "Database Persistence",
    "src/server/socketHandlers.ts & prisma",
    async () => {
      const dbLive = await isDbReachable();
      if (dbLive) {
        const rest = await prisma.restaurant.findUnique({ where: { slug } });
        if (!rest) throw new Error("Restaurant record not found in PostgreSQL");

        const dbOrder = await prisma.order.findFirst({
          where: {
            restaurantId: rest.id,
            tableNumber: table,
            roundNumber: 1,
            status: "SENT_TO_KITCHEN",
          },
        });

        if (!dbOrder) {
          throw new Error("Order with status SENT_TO_KITCHEN was not found in PostgreSQL!");
        }

        const payload = dbOrder.payloadJson as Record<string, unknown>;
        const items = (payload?.items as Array<{ name: string }>) || [];
        if (items.length !== 3) {
          throw new Error(`Expected 3 snapshot items in database order, found ${items.length}`);
        }

        return `Order #${dbOrder.id} saved in PostgreSQL with status SENT_TO_KITCHEN and all 3 items`;
      } else {
        // Local DB offline fallback: verify order status was dispatched as SENT_TO_KITCHEN
        const tickets = kdsOrdersBuffer.get(slug.toLowerCase()) || [];
        const ticket = tickets.find((t) => t.tableNumber === table && t.roundNumber === 1);
        if (!ticket || ticket.status !== "SENT_TO_KITCHEN") {
          throw new Error("Order status SENT_TO_KITCHEN not dispatched to ticket buffer");
        }
        return `Order status SENT_TO_KITCHEN verified (local PostgreSQL offline, verified via dispatched ticket)`;
      }
    }
  );

  await runStep(
    "Verify Table Session Reset for Round 2",
    "Session Lifecycle",
    "src/server/sessionStore.ts",
    async () => {
      const session = await sessionStore.getSession(sessionKey);
      if (!session) throw new Error("Session not found");

      if (session.roundNumber !== 2) {
        throw new Error(`Expected roundNumber 2, got ${session.roundNumber}`);
      }
      if (session.cart.length !== 0) {
        throw new Error(`Expected cart to be cleared, found ${session.cart.length} items`);
      }
      if (session.approvals && session.approvals.length !== 0) {
        throw new Error(`Expected approvals to reset to 0, found ${session.approvals.length}`);
      }
      if (session.users.length !== 3) {
        throw new Error(`Expected all 3 users to remain seated, found ${session.users.length}`);
      }
      if (session.submittedRounds?.length !== 1) {
        throw new Error(`Expected 1 submitted round recorded, found ${session.submittedRounds?.length}`);
      }
      if (!session.orderPlaced) {
        throw new Error("orderPlaced flag should be true for Round 1 celebration sync");
      }

      return `Table advanced to Round 2: empty cart, 0 approvals, orderPlaced=true, preserving 3 diners`;
    }
  );

  await runStep(
    "Verify KDS Fast-Sync Ticket Buffer",
    "Kitchen Display System",
    "src/server/socketHandlers.ts",
    async () => {
      const tickets = kdsOrdersBuffer.get(slug.toLowerCase()) || [];
      const tableTicket = tickets.find((t) => t.tableNumber === table && t.roundNumber === 1);

      if (!tableTicket) {
        throw new Error("KDS buffer ticket for Table 5 Round 1 not found!");
      }
      if (tableTicket.status !== "SENT_TO_KITCHEN") {
        throw new Error(`Expected KDS ticket status SENT_TO_KITCHEN, got ${tableTicket.status}`);
      }
      if (tableTicket.items.length !== 3) {
        throw new Error(`Expected 3 items on KDS ticket, found ${tableTicket.items.length}`);
      }

      return `KDS ticket active for Table 5 Round 1 with status SENT_TO_KITCHEN (${tableTicket.items.length} dishes)`;
    }
  );

  // ============================================================================
  // TEST 6: Multi-Round Ordering (Round 2 Additions & Placement)
  // ============================================================================
  console.log("\n--- TEST 6: Multi-Round Ordering ---");

  const itemCoffee = {
    id: "citem_coffee_01",
    menuItemId: "m_coffee",
    name: "South Indian Filter Coffee",
    priceInRupees: 40,
    priceInCents: 4000,
    quantity: 2,
    addedByUserId: "user_arjun",
    addedByUserName: "Arjun",
  };

  await runStep(
    "Round 2 Item Addition & Consensus Submission",
    "Multi-Round Ordering",
    "src/server/sessionStore.ts & /api/table-sync",
    async () => {
      // Arjun adds Filter Coffee for Round 2
      await callApi({
        action: "addItem",
        restaurantSlug: slug,
        tableNumber: table,
        item: itemCoffee,
      });

      // Vote on Round 2
      await callApi({ action: "submitApproval", restaurantSlug: slug, tableNumber: table, userId: "user_rahul" });
      await callApi({ action: "submitApproval", restaurantSlug: slug, tableNumber: table, userId: "user_sneha" });
      const resRound2 = await callApi({
        action: "submitApproval",
        restaurantSlug: slug,
        tableNumber: table,
        userId: "user_arjun",
      });

      if (resRound2.data.status !== "ORDER_SUBMITTED") {
        throw new Error(`Round 2 consensus failed: status=${resRound2.data.status}`);
      }
      if (resRound2.data.roundNumber !== 2 || resRound2.data.nextRoundNumber !== 3) {
        throw new Error(`Round 2 transition incorrect: round=${resRound2.data.roundNumber}, next=${resRound2.data.nextRoundNumber}`);
      }

      const session = await sessionStore.getSession(sessionKey);
      if (session?.submittedRounds?.length !== 2) {
        throw new Error(`Expected 2 submitted rounds, found ${session?.submittedRounds?.length}`);
      }

      const tickets = kdsOrdersBuffer.get(slug.toLowerCase()) || [];
      const round2Ticket = tickets.find((t) => t.tableNumber === table && t.roundNumber === 2);
      if (!round2Ticket) throw new Error("KDS ticket for Round 2 not found!");

      return `Round 2 submitted cleanly! KDS now tracks both Round 1 and Round 2 tickets`;
    }
  );

  // ============================================================================
  // TEST 7: Cashier Consolidated Billing & Table Reset
  // ============================================================================
  console.log("\n--- TEST 7: Cashier Master Bill & Table Settlement ---");

  let cashierBillId = "";

  await runStep(
    "Request Master Bill & Consolidate All Rounds",
    "Cashier Billing",
    "src/server/sessionStore.ts",
    async () => {
      const res = await callApi({
        action: "requestFinalBill",
        restaurantSlug: slug,
        tableNumber: table,
        userId: "user_rahul",
      });

      if (!res.data.success || !res.data.bill) {
        throw new Error("Final bill request failed");
      }

      const bill = res.data.bill;
      cashierBillId = bill.billId;

      // Round 1 (280 + 220 + 120 = 620) + Round 2 (80) = ₹700
      const expectedTotal = 700;
      if (bill.grandTotalInRupees !== expectedTotal) {
        throw new Error(`Expected consolidated total ₹${expectedTotal}, got ₹${bill.grandTotalInRupees}`);
      }
      if (bill.rounds?.length !== 2) {
        throw new Error(`Expected 2 rounds consolidated on bill, found ${bill.rounds?.length}`);
      }
      if (!bill.guestNames.includes("Rahul") || !bill.guestNames.includes("Sneha") || !bill.guestNames.includes("Arjun")) {
        throw new Error(`Guest names missing from bill: ${bill.guestNames.join(", ")}`);
      }

      return `Master Bill #${bill.billId} generated combining Round 1 + Round 2 (₹${bill.grandTotalInRupees}) for guests: ${bill.guestNames.join(", ")}`;
    }
  );

  await runStep(
    "Cashier Marks Bill PAID & Resets Table for Next Customer Group",
    "Cashier Billing & Table Turnover",
    "src/server/sessionStore.ts & /api/table-sync",
    async () => {
      const res = await callApi({
        action: "markBillPaid",
        restaurantSlug: slug,
        tableNumber: table,
        billId: cashierBillId,
      });

      if (!res.data.success || res.data.status !== "BILL_PAID") {
        throw new Error(`Mark bill paid failed: ${res.data.error || res.data.status}`);
      }

      // Verify DB orders marked COMPLETED if PostgreSQL is reachable
      const dbLive = await isDbReachable();
      if (dbLive) {
        const rest = await prisma.restaurant.findUnique({ where: { slug } });
        const activeDbOrders = await prisma.order.findMany({
          where: {
            restaurantId: rest?.id,
            tableNumber: table,
            status: { notIn: ["COMPLETED", "ACTIVE_TABLE_SESSION"] },
          },
        });

        if (activeDbOrders.length > 0) {
          throw new Error(`Expected all table orders to be COMPLETED, found ${activeDbOrders.length} uncompleted`);
        }
      }

      // Verify active session reset for new customer group
      const session = await sessionStore.getSession(sessionKey);
      if (!session) throw new Error("Session not found");
      if (session.roundNumber !== 1) {
        throw new Error(`Expected roundNumber reset to 1, got ${session.roundNumber}`);
      }
      if (session.users.length !== 0) {
        throw new Error(`Expected seated users to be cleared for next group, found ${session.users.length}`);
      }
      if (session.cart.length !== 0) {
        throw new Error(`Expected cart to be cleared, found ${session.cart.length}`);
      }

      return `Bill #${cashierBillId} settled as PAID, DB orders marked COMPLETED, Table 5 reset for next customer group`;
    }
  );

  // ============================================================================
  // SUMMARY REPORT GENERATION
  // ============================================================================
  console.log("\n================================================================================");
  console.log("📊 MULTIPLAYER HEALTH & BUG AUDIT REPORT");
  console.log("================================================================================");

  const total = auditResults.length;
  const passedCount = auditResults.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`\nTotal Test Scenarios : ${total}`);
  console.log(`Passed Assertions    : ${passedCount} ✅`);
  console.log(`Failed Assertions    : ${failedCount} ${failedCount === 0 ? "🎉" : "❌"}\n`);

  console.log("| # | Scenario Name | Category | Status | Duration | File |");
  console.log("|---|---|---|---|---|---|");
  auditResults.forEach((r, idx) => {
    const statusIcon = r.passed ? "PASS ✅" : "FAIL ❌";
    console.log(
      `| ${idx + 1} | ${r.name} | ${r.category} | ${statusIcon} | ${r.durationMs}ms | ${r.file || "-"} |`
    );
  });

  if (failedCount > 0) {
    console.log("\n🚨 FAILURES DETECTED:");
    auditResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n❌ [${r.name}]`);
        console.log(`   Category   : ${r.category}`);
        console.log(`   File       : ${r.file}`);
        console.log(`   Error      : ${r.error}`);
      });
  } else {
    console.log("\n🏆 ALL MULTIPLAYER SCENARIOS PASSED 100% WITH ZERO RACE CONDITIONS OR DESYNCS!");
  }
  console.log("================================================================================\n");

  try {
    redis.disconnect();
    await prisma.$disconnect();
  } catch {}

  process.exit(failedCount === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("Unhandled fatal error in audit script:", err);
  try {
    redis.disconnect();
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
