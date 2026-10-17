import http from "http";
import express from "express";
import { Server } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { registerSocketHandlers, kdsOrdersBuffer } from "../src/server/socketHandlers";
import { sessionStore, buildSessionKey } from "../src/server/sessionStore";
import { redis } from "../src/lib/redis";
import { prisma } from "../src/lib/prisma";
import type { KdsTicket } from "../src/types/kds";

interface CallbackResponse {
  success?: boolean;
  error?: string;
  message?: string;
  kdsRoom?: string;
  orderId?: string;
  status?: string;
  tickets?: KdsTicket[];
  session?: {
    users?: Array<{ id: string; name: string }>;
    cart?: Array<{ id: string; name: string }>;
    roundNumber?: number;
    status?: string;
  };
}

async function runPhase6Tests() {
  console.log("🧪 Starting Phase 6: Kitchen Display System (KDS) Integration Tests...\n");

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  registerSocketHandlers(io);

  const TEST_PORT = 3106;
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Temporary KDS test server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const restaurantSlug = "burger-loft";
  const tableNumber = 5;
  const sessionKey = buildSessionKey(restaurantSlug, tableNumber);

  // Clear session and KDS buffer for clean test run
  await sessionStore.deleteSession(sessionKey);
  kdsOrdersBuffer.delete(restaurantSlug.toLowerCase());

  const allSockets: ClientSocketType[] = [];

  // Clients: KDS Station 1, Guest Diner (Alice), KDS Station 2 (Latecomer Screen)
  const clientKds1: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientDiner: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  allSockets.push(clientKds1, clientDiner);

  await Promise.all([
    new Promise<void>((res) => clientKds1.on("connect", () => res())),
    new Promise<void>((res) => clientDiner.on("connect", () => res())),
  ]);

  console.log("✅ KDS Display #1 and Guest Diner sockets connected.");

  try {
    // ------------------------------------------------------------------------
    // TEST 1: KDS Station 1 joins room:kds:burger-loft
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 1: KDS Station Joins room:kds:burger-loft ---");
    let joinResponse: CallbackResponse = {};

    await new Promise<void>((resolve, reject) => {
      clientKds1.emit("JOIN_KDS", { restaurantSlug }, (res: CallbackResponse) => {
        if (res?.success && res.kdsRoom === `room:kds:${restaurantSlug}`) {
          joinResponse = res;
          console.log(`✅ KDS Display joined ${res.kdsRoom} successfully.`);
          resolve();
        } else {
          reject(new Error(`JOIN_KDS failed: ${res?.error || JSON.stringify(res)}`));
        }
      });
    });

    if (!Array.isArray(joinResponse.tickets)) {
      throw new Error("Expected tickets array in JOIN_KDS callback response");
    }
    console.log(`✅ Initial tickets loaded: ${joinResponse.tickets.length} tickets on kitchen board.`);

    // ------------------------------------------------------------------------
    // TEST 2: Diner orders food -> 100% consensus emits NEW_ORDER_TICKET to KDS
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 2: Diner Order Submitted -> NEW_ORDER_TICKET Received by KDS ---");
    const aliceId = "user-alice-kds";

    // Alice joins table 5
    await new Promise<void>((resolve) => {
      clientDiner.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: aliceId, userName: "Alice" },
        () => resolve()
      );
    });

    // Alice adds a Classic Cheeseburger with modifiers
    await new Promise<void>((resolve) => {
      clientDiner.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-classic-burger",
          name: "The Classic Cheeseburger",
          priceInCents: 1450,
          quantity: 2,
          selectedModifiers: { Temperature: "Medium Rare", "Extra Cheese": "Aged Cheddar" },
          notes: "Extra crispy bun please",
          userId: aliceId,
          userName: "Alice",
        },
        () => resolve()
      );
    });

    // Listen on KDS for the real-time NEW_ORDER_TICKET event
    const kdsTicketPromise = new Promise<KdsTicket>((resolve) => {
      clientKds1.once("NEW_ORDER_TICKET", (ticket: KdsTicket) => {
        resolve(ticket);
      });
    });

    // Alice triggers review and approves (sole diner = 100% consensus)
    await new Promise<void>((resolve) => {
      clientDiner.emit("TRIGGER_REVIEW", { restaurantSlug, tableNumber, userId: aliceId }, () => resolve());
    });

    await new Promise<void>((resolve) => {
      clientDiner.emit(
        "SUBMIT_APPROVAL",
        { restaurantSlug, tableNumber, userId: aliceId, hasApproved: true },
        () => resolve()
      );
    });

    const receivedTicket = await kdsTicketPromise;
    console.log(`✅ KDS Display received real-time NEW_ORDER_TICKET!`);
    console.log(`   Order ID: #${receivedTicket.orderId}`);
    console.log(`   Table: ${receivedTicket.tableNumber}, Round: ${receivedTicket.roundNumber}`);
    console.log(`   Total: $${(receivedTicket.totalInCents / 100).toFixed(2)}`);
    console.log(`   Items: ${receivedTicket.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`);

    if (receivedTicket.tableNumber !== 5 || receivedTicket.roundNumber !== 1) {
      throw new Error("Ticket metadata mismatch");
    }
    if (receivedTicket.items.length !== 1 || receivedTicket.items[0].quantity !== 2) {
      throw new Error("Ticket items mismatch");
    }

    // ------------------------------------------------------------------------
    // TEST 3: Kitchen Staff Marks Ticket as "Entered into POS"
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 3: Kitchen Staff Marks Ticket as 'ENTERED_INTO_POS' ---");

    const statusChangePromise = new Promise<{ orderId: string; status: string; completedAt?: string }>(
      (resolve) => {
        clientKds1.once(
          "KDS_ORDER_STATUS_CHANGED",
          (data: { orderId: string; status: string; completedAt?: string }) => {
            resolve(data);
          }
        );
      }
    );

    await new Promise<void>((resolve, reject) => {
      clientKds1.emit(
        "KDS_UPDATE_ORDER_STATUS",
        {
          restaurantSlug,
          orderId: receivedTicket.orderId,
          status: "ENTERED_INTO_POS",
        },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "ENTERED_INTO_POS") {
            resolve();
          } else {
            reject(new Error(`KDS_UPDATE_ORDER_STATUS failed: ${res?.error}`));
          }
        }
      );
    });

    const broadcastedChange = await statusChangePromise;
    console.log(`✅ KDS received KDS_ORDER_STATUS_CHANGED broadcast for Order #${broadcastedChange.orderId}: status="${broadcastedChange.status}"`);

    if (broadcastedChange.status !== "ENTERED_INTO_POS" || !broadcastedChange.completedAt) {
      throw new Error("Missing status or completedAt in KDS status change");
    }

    // ------------------------------------------------------------------------
    // TEST 4: Latecomer KDS Screen Joins -> Receives Completed Ticket in Initial State
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 4: Second KDS Display Station Connects -> State Sync ---");
    const clientKds2: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
    allSockets.push(clientKds2);
    await new Promise<void>((res) => clientKds2.on("connect", () => res()));

    let kds2Tickets: KdsTicket[] = [];
    await new Promise<void>((resolve, reject) => {
      clientKds2.emit("JOIN_KDS", { restaurantSlug }, (res: CallbackResponse) => {
        if (res?.success && Array.isArray(res.tickets)) {
          kds2Tickets = res.tickets;
          resolve();
        } else {
          reject(new Error(`KDS #2 join failed: ${res?.error}`));
        }
      });
    });

    const syncedTicket = kds2Tickets.find((t) => t.orderId === receivedTicket.orderId);
    if (!syncedTicket || syncedTicket.status !== "ENTERED_INTO_POS") {
      throw new Error(`Synced ticket state incorrect: status is ${syncedTicket?.status}`);
    }
    console.log(`✅ KDS Display #2 synced existing ticket #${syncedTicket.orderId} with status="${syncedTicket.status}"`);

    // ------------------------------------------------------------------------
    // TEST 5: Recall Ticket back to Active ("CONFIRMED")
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 5: Recall Ticket back to Active ('CONFIRMED') ---");

    const recallPromise = new Promise<{ orderId: string; status: string }>((resolve) => {
      clientKds2.once("KDS_ORDER_STATUS_CHANGED", (data: { orderId: string; status: string }) => {
        resolve(data);
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientKds1.emit(
        "KDS_UPDATE_ORDER_STATUS",
        {
          restaurantSlug,
          orderId: receivedTicket.orderId,
          status: "CONFIRMED",
        },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "CONFIRMED") {
            resolve();
          } else {
            reject(new Error(`Recall failed: ${res?.error}`));
          }
        }
      );
    });

    const recalledChange = await recallPromise;
    console.log(`✅ KDS Display #2 observed ticket #${recalledChange.orderId} recalled to status="${recalledChange.status}"`);

    console.log("\n🎉 ALL PHASE 6 KDS INTEGRATION TESTS PASSED CLEANLY!");
  } finally {
    for (const s of allSockets) {
      try {
        s.disconnect();
      } catch {
        // ignore
      }
    }
    io.close();
    await sessionStore.deleteSession(sessionKey);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      redis.disconnect();
    } catch {
      // ignore
    }
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    console.log("[Test Server] Test server shut down cleanly.");
  }
}

runPhase6Tests()
  .then(() => {
    console.log("Integration test completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Integration test failed with error:", err);
    process.exit(1);
  });
