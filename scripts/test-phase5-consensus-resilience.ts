import http from "http";
import express from "express";
import { Server } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { registerSocketHandlers } from "../src/server/socketHandlers";
import { sessionStore, buildSessionKey } from "../src/server/sessionStore";
import { redis } from "../src/lib/redis";
import { prisma } from "../src/lib/prisma";

interface CallbackResponse {
  success?: boolean;
  error?: string;
  message?: string;
  kdsRoom?: string;
  cartItemId?: string;
  status?: string;
  orderId?: string;
  session?: {
    users?: Array<{ id: string; name: string }>;
    cart?: Array<{ id: string; name: string; addedByUserId: string; addedByName: string; priceInCents: number }>;
    consensusVotes?: Record<string, boolean>;
    roundNumber?: number;
    status?: string;
  };
}

interface OrderTicketEvent {
  orderId: string;
  items: unknown[];
  totalInCents: number;
}

interface OrderSuccessEvent {
  roundNumber: number;
  nextRoundNumber: number;
  session: {
    cart: unknown[];
    roundNumber: number;
    status: string;
    users: Array<{ id: string; name: string }>;
  };
}

async function runPhase5Tests() {
  console.log("🧪 Starting Phase 5: Consensus Voting Modal & Network Resilience Integration Tests...\n");

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  registerSocketHandlers(io);

  const TEST_PORT = 3105;
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Temporary test server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const restaurantSlug = "burger-loft";
  const tableNumber = 7;
  const sessionKey = buildSessionKey(restaurantSlug, tableNumber);

  // Clean session state before testing
  await sessionStore.deleteSession(sessionKey);

  // Sockets list for guaranteed cleanup
  const allSockets: ClientSocketType[] = [];

  // Connect clients: Alice, Bob, and Kitchen Display
  const clientAlice: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientBob: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientKds: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  allSockets.push(clientAlice, clientBob, clientKds);

  await Promise.all([
    new Promise<void>((res) => clientAlice.on("connect", () => res())),
    new Promise<void>((res) => clientBob.on("connect", () => res())),
    new Promise<void>((res) => clientKds.on("connect", () => res())),
  ]);

  console.log("✅ Alice, Bob, and Kitchen Display sockets connected successfully.");

  try {
    // ------------------------------------------------------------------------
    // SETUP: KDS joins
    // ------------------------------------------------------------------------
    await new Promise<void>((resolve, reject) => {
      clientKds.emit("JOIN_KDS", { restaurantSlug }, (response: CallbackResponse) => {
        if (response.success) {
          console.log(`✅ [Setup] KDS joined room for ${restaurantSlug}`);
          resolve();
        } else {
          reject(new Error(`KDS join failed: ${response.error}`));
        }
      });
    });

    // ------------------------------------------------------------------------
    // TEST 1: Alice and Bob join Table 7 (Round 1)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 1: Alice & Bob Join Table 7 ---");
    const aliceId = "user-alice-p5";
    const bobId = "user-bob-p5";

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: aliceId, userName: "Alice" },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.roundNumber === 1) {
            console.log("✅ Alice joined table 7 (Round 1 initialized)");
            resolve();
          } else {
            reject(new Error(`Alice join failed: ${res?.error || JSON.stringify(res)}`));
          }
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: bobId, userName: "Bob" },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.users?.length === 2) {
            console.log("✅ Bob joined table 7 (2 diners active: Alice & Bob)");
            resolve();
          } else {
            reject(new Error(`Bob join failed: ${res?.error || JSON.stringify(res)}`));
          }
        }
      );
    });

    // ------------------------------------------------------------------------
    // TEST 2: Add Items to Round 1 Cart
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 2: Adding Items to Table Cart ---");
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-classic-burger",
          name: "The Classic Cheeseburger",
          priceInCents: 1450,
          quantity: 1,
          selectedModifiers: { Temperature: "Medium Rare", "Extra Cheese": "Aged Cheddar" },
          userId: aliceId,
          userName: "Alice",
        },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log("✅ Alice added Classic Cheeseburger ($14.50)");
            resolve();
          } else {
            reject(new Error(`Alice add item failed: ${res?.error}`));
          }
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-truffle-fries",
          name: "Crispy Truffle Fries",
          priceInCents: 650,
          quantity: 1,
          selectedModifiers: {},
          userId: bobId,
          userName: "Bob",
        },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log("✅ Bob added Crispy Truffle Fries ($6.50)");
            resolve();
          } else {
            reject(new Error(`Bob add item failed: ${res?.error}`));
          }
        }
      );
    });

    // ------------------------------------------------------------------------
    // TEST 3: Trigger Review Order (Opens Consensus Modal)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 3: Trigger Consensus Review ---");
    const bobReviewModalPromise = new Promise<{ triggeredByUserId: string }>((resolve) => {
      clientBob.once("REVIEW_MODAL_OPEN", (data: { triggeredByUserId: string }) => {
        resolve(data);
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "TRIGGER_REVIEW",
        { restaurantSlug, tableNumber, userId: aliceId },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log("✅ Alice triggered review order");
            resolve();
          } else {
            reject(new Error(`Trigger review failed: ${res?.error}`));
          }
        }
      );
    });

    const reviewEvent = await bobReviewModalPromise;
    console.log(`✅ Bob received REVIEW_MODAL_OPEN broadcast triggered by: ${reviewEvent.triggeredByUserId}`);

    // Verify session status is REVIEWING
    const reviewSession = await sessionStore.getSession(sessionKey);
    if (reviewSession?.status === "REVIEWING") {
      console.log("✅ Session status successfully set to 'REVIEWING'");
    } else {
      throw new Error(`Expected status REVIEWING, got ${reviewSession?.status}`);
    }

    // ------------------------------------------------------------------------
    // TEST 4: Partial Consensus (Alice Votes Yes, Bob Pending)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 4: Consensus Voting (Partial vs 100% Full Consensus) ---");

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "SUBMIT_APPROVAL",
        { restaurantSlug, tableNumber, userId: aliceId, hasApproved: true },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "VOTE_RECORDED") {
            console.log("✅ Alice voted 'Looks Good!' -> Table remains in review (Vote recorded: 1/2 = 50%)");
            resolve();
          } else {
            reject(new Error(`Alice submit approval failed: ${res?.error || res?.status}`));
          }
        }
      );
    });

    const midSession = await sessionStore.getSession(sessionKey);
    const aliceVoted = midSession?.consensusVotes[aliceId];
    const bobVoted = midSession?.consensusVotes[bobId];
    if (aliceVoted === true && !bobVoted) {
      console.log("✅ Real-time voting state verified: Alice (Ready ✅), Bob (Reviewing... ⏳)");
    } else {
      throw new Error(`Voting state mismatch in session store: alice=${aliceVoted}, bob=${bobVoted}`);
    }

    // ------------------------------------------------------------------------
    // TEST 5: Full 100% Consensus -> Kitchen Ticket & Round 2 Reset
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 5: Bob Approves -> 100% Consensus & Round 2 Transition ---");

    const kdsTicketPromise = new Promise<OrderTicketEvent>((resolve) => {
      clientKds.once("NEW_ORDER_TICKET", (data: OrderTicketEvent) => {
        resolve(data);
      });
    });

    const aliceSuccessPromise = new Promise<OrderSuccessEvent>((resolve) => {
      clientAlice.once("ORDER_SUBMITTED_SUCCESS", (data: OrderSuccessEvent) => {
        resolve(data);
      });
    });

    const bobSuccessPromise = new Promise<OrderSuccessEvent>((resolve) => {
      clientBob.once("ORDER_SUBMITTED_SUCCESS", (data: OrderSuccessEvent) => {
        resolve(data);
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "SUBMIT_APPROVAL",
        { restaurantSlug, tableNumber, userId: bobId, hasApproved: true },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "ORDER_SUBMITTED") {
            console.log("✅ Bob voted 'Looks Good!' -> 100% Consensus Reached! Order is LOCKED & Sent.");
            resolve();
          } else {
            reject(new Error(`Bob submit approval failed: ${res?.error || res?.status}`));
          }
        }
      );
    });

    const [kdsTicket, aliceSuccess, bobSuccess] = await Promise.all([
      kdsTicketPromise,
      aliceSuccessPromise,
      bobSuccessPromise,
    ]);

    console.log(`✅ KDS received NEW_ORDER_TICKET with Order ID: ${kdsTicket.orderId}, Total: $${(kdsTicket.totalInCents / 100).toFixed(2)}`);
    console.log(`✅ Alice & Bob received ORDER_SUBMITTED_SUCCESS for Round ${aliceSuccess.roundNumber} -> Next Round: ${aliceSuccess.nextRoundNumber}`);

    if (bobSuccess.nextRoundNumber !== 2 || bobSuccess.session.roundNumber !== 2) {
      throw new Error("Round number did not increment to 2");
    }
    if (bobSuccess.session.cart.length !== 0) {
      throw new Error("Cart was not cleared for Round 2");
    }
    console.log("✅ Session automatically reset for Round 2: empty cart, approvals cleared, roundNumber = 2");

    // ------------------------------------------------------------------------
    // TEST 6: Latecomer (Charlie) Joins in Round 2
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 6: Latecomer Joining in Round 2 ---");
    const clientCharlie: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
    allSockets.push(clientCharlie);
    await new Promise<void>((res) => clientCharlie.on("connect", () => res()));

    const charlieId = "user-charlie-p5";
    await new Promise<void>((resolve, reject) => {
      clientCharlie.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: charlieId, userName: "Charlie" },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.roundNumber === 2 && res.session?.users?.length === 3) {
            console.log("✅ Charlie joined late at Round 2. Total table guests now: 3 (Alice, Bob, Charlie)");
            resolve();
          } else {
            reject(new Error(`Charlie join failed: ${res?.error}`));
          }
        }
      );
    });

    // Charlie adds a drink in Round 2
    await new Promise<void>((resolve, reject) => {
      clientCharlie.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-lemonade",
          name: "Handcrafted Lemonade",
          priceInCents: 450,
          quantity: 1,
          selectedModifiers: {},
          userId: charlieId,
          userName: "Charlie",
        },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log("✅ Charlie added Handcrafted Lemonade ($4.50) in Round 2");
            resolve();
          } else {
            reject(new Error(`Charlie add item failed: ${res?.error}`));
          }
        }
      );
    });

    // ------------------------------------------------------------------------
    // TEST 7: Network Resilience ("Bad WiFi" Safeguard & Authoritative Re-sync)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 7: Network Resilience & Authoritative State Re-sync ---");

    // Simulate Bob experiencing a network drop (disconnect)
    console.log("📡 Simulating Bob disconnecting due to bad restaurant WiFi...");
    clientBob.disconnect();

    // While Bob is disconnected, Alice adds dessert to the table cart
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-brownie",
          name: "Double Chocolate Brownie",
          priceInCents: 750,
          quantity: 1,
          selectedModifiers: {},
          userId: aliceId,
          userName: "Alice",
        },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log("✅ While Bob was offline, Alice added Double Chocolate Brownie to cart");
            resolve();
          } else {
            reject(new Error(`Alice add brownie failed: ${res?.error}`));
          }
        }
      );
    });

    // Bob reconnects (new socket simulating reconnection)
    console.log("🔄 Bob's WiFi reconnects -> Requesting authoritative state from Redis...");
    const clientBobReconnected: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
    allSockets.push(clientBobReconnected);
    await new Promise<void>((res) => clientBobReconnected.on("connect", () => res()));

    // Bob re-joins table room and requests authoritative sync
    await new Promise<void>((resolve) => {
      clientBobReconnected.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: bobId, userName: "Bob" },
        () => resolve()
      );
    });

    const syncResponse = await new Promise<CallbackResponse>((resolve, reject) => {
      clientBobReconnected.emit(
        "REQUEST_SYNC",
        { restaurantSlug, tableNumber },
        (res: CallbackResponse) => {
          if (res?.success) {
            resolve(res);
          } else {
            reject(new Error(`Sync response failed: ${res?.error}`));
          }
        }
      );
    });

    const syncedCart = syncResponse.session?.cart || [];
    console.log(`✅ Bob successfully fetched authoritative state from Redis.`);
    console.log(`   Items in cart: ${syncedCart.length} (${syncedCart.map((i) => i.name).join(", ")})`);

    const hasBrownie = syncedCart.some((i) => i.name === "Double Chocolate Brownie");
    const hasLemonade = syncedCart.some((i) => i.name === "Handcrafted Lemonade");

    if (hasBrownie && hasLemonade && syncedCart.length === 2) {
      console.log("✅ Authoritative sync verified! Bob has all items added during his offline period without stale state.");
    } else {
      throw new Error("Cart items out of sync after reconnection!");
    }

    console.log("\n🎉 ALL PHASE 5 INTEGRATION TESTS PASSED CLEANLY!");
  } finally {
    // Disconnect all sockets first so server can close immediately
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
      // ignore offline disconnect
    }
    try {
      await prisma.$disconnect();
    } catch {
      // ignore offline disconnect
    }
    console.log("[Test Server] Test server shut down & Redis/Prisma connections closed.");
  }
}

runPhase5Tests()
  .then(() => {
    console.log("Integration test completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Integration test failed with error:", err);
    process.exit(1);
  });
