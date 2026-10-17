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
  cartItemId?: string;
  session?: {
    users?: Array<{ id: string; name: string }>;
    cart?: Array<{ id: string; name: string; addedByUserId: string; priceInCents: number }>;
    consensusVotes?: Record<string, boolean>;
    roundNumber?: number;
    status?: string;
  };
}

interface CartUpdatedPayload {
  cart: Array<{ id: string; name: string; addedByUserId: string }>;
  removedItemId?: string;
}

interface ErrorUnauthorizedPayload {
  error: string;
  message: string;
  cartItemId: string;
}

interface ReviewModalPayload {
  triggeredByUserId: string;
  triggeredByName: string;
}

interface OrderSuccessPayload {
  orderId: string;
  roundNumber: number;
  nextRoundNumber: number;
  session: {
    cart: unknown[];
    roundNumber: number;
  };
}

async function runMultiplayerSimulation() {
  console.log("========================================================================");
  console.log("🎮 PlateSync - Phase 7: Automated Multi-Client Verification Test");
  console.log("========================================================================\n");

  // 1. Initialize Express + Socket.IO Test Server
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  registerSocketHandlers(io);

  const TEST_PORT = 3107;
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Local WebSocket test server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const restaurantSlug = "burger-loft";
  const tableNumber = 5;
  const sessionKey = buildSessionKey(restaurantSlug, tableNumber);

  // Clean slate: reset Redis session and KDS buffer for Table 5
  await sessionStore.deleteSession(sessionKey);
  kdsOrdersBuffer.delete(restaurantSlug.toLowerCase());

  const allSockets: ClientSocketType[] = [];

  // 2. Programmatically Connect KDS Screen & 3 Virtual Diners
  const clientKds: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientAlice: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientBob: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientCharlie: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });

  allSockets.push(clientKds, clientAlice, clientBob, clientCharlie);

  await Promise.all([
    new Promise<void>((res) => clientKds.on("connect", () => res())),
    new Promise<void>((res) => clientAlice.on("connect", () => res())),
    new Promise<void>((res) => clientBob.on("connect", () => res())),
    new Promise<void>((res) => clientCharlie.on("connect", () => res())),
  ]);

  console.log("✅ KDS Display Screen and 3 Virtual Clients (Alice, Bob, Charlie) connected.\n");

  try {
    // ------------------------------------------------------------------------
    // SETUP: Kitchen Display System (KDS) joins room:kds:burger-loft
    // ------------------------------------------------------------------------
    await new Promise<void>((resolve, reject) => {
      clientKds.emit("JOIN_KDS", { restaurantSlug }, (res: CallbackResponse) => {
        if (res?.success) {
          console.log(`[Setup] KDS joined room: ${res.kdsRoom}`);
          resolve();
        } else {
          reject(new Error(`KDS failed to join: ${res?.error}`));
        }
      });
    });

    // ------------------------------------------------------------------------
    // STEP 1: Programmatically connect 3 virtual users to "burger-loft", Table 5
    // ------------------------------------------------------------------------
    console.log("--- STEP 1: Connect 3 Virtual Users to 'burger-loft', Table 5 ---");
    const aliceId = "user_alice";
    const bobId = "user_bob";
    const charlieId = "user_charlie";

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: aliceId, userName: "Alice" },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.users?.some((u) => u.id === aliceId)) {
            console.log(`✅ [1.1] Alice joined Table 5 (Round ${res.session.roundNumber})`);
            resolve();
          } else {
            reject(new Error(`Alice JOIN_TABLE failed: ${res?.error}`));
          }
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: bobId, userName: "Bob" },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.users?.some((u) => u.id === bobId)) {
            console.log(`✅ [1.2] Bob joined Table 5 (Total guests: ${res.session.users?.length})`);
            resolve();
          } else {
            reject(new Error(`Bob JOIN_TABLE failed: ${res?.error}`));
          }
        }
      );
    });

    await new Promise<void>((resolve, reject) => {
      clientCharlie.emit(
        "JOIN_TABLE",
        { restaurantSlug, tableNumber, userId: charlieId, userName: "Charlie" },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.users?.length === 3) {
            console.log(`✅ [1.3] Charlie joined Table 5 (Total guests: 3 -> Alice, Bob, Charlie)`);
            resolve();
          } else {
            reject(new Error(`Charlie JOIN_TABLE failed: ${res?.error}`));
          }
        }
      );
    });

    // ------------------------------------------------------------------------
    // STEP 2: Alice adds "Truffle Burger" and Bob adds "Truffle Fries"
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 2: Alice Adds 'Truffle Burger' & Bob Adds 'Truffle Fries' ---");
    let aliceBurgerId = "";
    let bobFriesId = "";

    // 2.1 Alice adds Truffle Burger ($18.50)
    const aliceAddPromise = new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-truffle-burger",
          name: "Truffle Burger",
          priceInCents: 1850,
          quantity: 1,
          selectedModifiers: { "Doneness": "Medium Rare" },
          userId: aliceId,
          userName: "Alice",
        },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.cart) {
            const added = res.session.cart.find((i) => i.addedByUserId === aliceId);
            if (added) {
              aliceBurgerId = added.id;
              console.log(`✅ [2.1] Alice added 'Truffle Burger' ($18.50) [Item ID: ${aliceBurgerId}]`);
              resolve();
              return;
            }
          }
          reject(new Error(`Failed to add Alice's Truffle Burger: ${res?.error}`));
        }
      );
    });
    await aliceAddPromise;

    // 2.2 Bob adds Truffle Fries ($7.50)
    const bobAddPromise = new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item-truffle-fries",
          name: "Truffle Fries",
          priceInCents: 750,
          quantity: 1,
          selectedModifiers: {},
          userId: bobId,
          userName: "Bob",
        },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.cart) {
            const added = res.session.cart.find((i) => i.addedByUserId === bobId);
            if (added) {
              bobFriesId = added.id;
              console.log(`✅ [2.2] Bob added 'Truffle Fries' ($7.50) [Item ID: ${bobFriesId}]`);
              resolve();
              return;
            }
          }
          reject(new Error(`Failed to add Bob's Truffle Fries: ${res?.error}`));
        }
      );
    });
    await bobAddPromise;

    // Verify cart snapshot from Redis
    const sessionStep2 = await sessionStore.getSession(sessionKey);
    console.log(`✅ [2.3] Shared table cart verified: ${sessionStep2?.cart.length} items (${sessionStep2?.cart.map((i) => `${i.name} by ${i.addedByUserName || i.addedByUserId}`).join(", ")})`);
    if (sessionStep2?.cart.length !== 2) {
      throw new Error(`Expected 2 items in cart, found ${sessionStep2?.cart.length}`);
    }

    // ------------------------------------------------------------------------
    // STEP 3: Verify Charlie CANNOT delete Alice's burger (ERROR_UNAUTHORIZED)
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 3: Verify Charlie CANNOT Delete Alice's Burger ---");

    const charlieUnauthorizedEventPromise = new Promise<ErrorUnauthorizedPayload>((resolve) => {
      clientCharlie.once("ERROR_UNAUTHORIZED", (data: ErrorUnauthorizedPayload) => {
        resolve(data);
      });
    });

    let charlieRemoveResponse: CallbackResponse = {};
    await new Promise<void>((resolve) => {
      clientCharlie.emit(
        "REMOVE_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          cartItemId: aliceBurgerId,
          userId: charlieId,
        },
        (res: CallbackResponse) => {
          charlieRemoveResponse = res;
          resolve();
        }
      );
    });

    const unauthorizedEvent = await charlieUnauthorizedEventPromise;

    // Verify Charlie was rejected with ERROR_UNAUTHORIZED
    if (
      charlieRemoveResponse.success === false &&
      charlieRemoveResponse.error === "ERROR_UNAUTHORIZED" &&
      unauthorizedEvent.error === "ERROR_UNAUTHORIZED"
    ) {
      console.log(`✅ [3.1] Unauthorized deletion correctly BLOCKED by server!`);
      console.log(`   Callback response error: "${charlieRemoveResponse.error}"`);
      console.log(`   Socket error event received: "${unauthorizedEvent.message}"`);
    } else {
      throw new Error(
        `Security failure: Charlie's unauthorized delete was not properly rejected! Got: ${JSON.stringify(charlieRemoveResponse)}`
      );
    }

    // Verify Alice's burger is STILL in the cart
    const sessionStep3 = await sessionStore.getSession(sessionKey);
    const burgerStillExists = sessionStep3?.cart.some((i) => i.id === aliceBurgerId);
    if (burgerStillExists) {
      console.log(`✅ [3.2] Verified Alice's 'Truffle Burger' remains safe in cart (ownership integrity confirmed).`);
    } else {
      throw new Error("Integrity failure: Alice's burger was unexpectedly deleted!");
    }

    // ------------------------------------------------------------------------
    // STEP 4: Verify Alice CAN delete her own burger
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 4: Verify Alice CAN Delete Her Own Burger ---");

    const bobCartUpdatedPromise = new Promise<CartUpdatedPayload>((resolve) => {
      clientBob.once("CART_UPDATED", (data: CartUpdatedPayload) => {
        resolve(data);
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "REMOVE_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          cartItemId: aliceBurgerId,
          userId: aliceId,
        },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log(`✅ [4.1] Alice successfully deleted her own 'Truffle Burger'.`);
            resolve();
          } else {
            reject(new Error(`Alice failed to delete her own item: ${res?.error}`));
          }
        }
      );
    });

    const cartUpdatedBroadcast = await bobCartUpdatedPromise;
    console.log(`✅ [4.2] Bob received CART_UPDATED broadcast (Removed item: ${cartUpdatedBroadcast.removedItemId})`);

    const sessionStep4 = await sessionStore.getSession(sessionKey);
    const burgerGone = !sessionStep4?.cart.some((i) => i.id === aliceBurgerId);
    const friesRemain = sessionStep4?.cart.some((i) => i.id === bobFriesId);

    if (burgerGone && friesRemain && sessionStep4?.cart.length === 1) {
      console.log(`✅ [4.3] Verified Alice's burger is removed, Bob's 'Truffle Fries' remains in cart.`);
    } else {
      throw new Error("Cart state mismatch after Alice's deletion!");
    }

    // ------------------------------------------------------------------------
    // STEP 5: Charlie triggers "Review Order"
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 5: Charlie Triggers 'Review Order' ---");

    const aliceReviewModalPromise = new Promise<ReviewModalPayload>((resolve) => {
      clientAlice.once("REVIEW_MODAL_OPEN", (data: ReviewModalPayload) => {
        resolve(data);
      });
    });

    const bobReviewModalPromise = new Promise<ReviewModalPayload>((resolve) => {
      clientBob.once("REVIEW_MODAL_OPEN", (data: ReviewModalPayload) => {
        resolve(data);
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientCharlie.emit(
        "TRIGGER_REVIEW",
        {
          restaurantSlug,
          tableNumber,
          userId: charlieId,
        },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.status === "REVIEWING") {
            console.log(`✅ [5.1] Charlie triggered Review Order.`);
            resolve();
          } else {
            reject(new Error(`Failed to trigger review order: ${res?.error}`));
          }
        }
      );
    });

    const [aliceReviewModal, bobReviewModal] = await Promise.all([
      aliceReviewModalPromise,
      bobReviewModalPromise,
    ]);

    console.log(`✅ [5.2] Alice & Bob received REVIEW_MODAL_OPEN broadcast (Triggered by: ${aliceReviewModal.triggeredByName || bobReviewModal.triggeredByName})`);

    const sessionStep5 = await sessionStore.getSession(sessionKey);
    if (sessionStep5?.status === "REVIEWING") {
      console.log(`✅ [5.3] Table 5 status transitioned to 'REVIEWING'.`);
    } else {
      throw new Error(`Expected status REVIEWING, got ${sessionStep5?.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 6: Alice and Charlie vote "Looks Good!", verify order remains pending
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 6: Alice & Charlie Vote 'Looks Good!' (Order Remains Pending) ---");

    // 6.1 Alice votes "Looks Good!"
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "SUBMIT_APPROVAL",
        {
          restaurantSlug,
          tableNumber,
          userId: aliceId,
          hasApproved: true,
        },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "VOTE_RECORDED") {
            console.log(`✅ [6.1] Alice voted 'Looks Good!' -> Vote recorded.`);
            resolve();
          } else {
            reject(new Error(`Alice approval failed: ${res?.error || res?.status}`));
          }
        }
      );
    });

    // 6.2 Charlie votes "Looks Good!"
    await new Promise<void>((resolve, reject) => {
      clientCharlie.emit(
        "SUBMIT_APPROVAL",
        {
          restaurantSlug,
          tableNumber,
          userId: charlieId,
          hasApproved: true,
        },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "VOTE_RECORDED") {
            console.log(`✅ [6.2] Charlie voted 'Looks Good!' -> Vote recorded.`);
            resolve();
          } else {
            reject(new Error(`Charlie approval failed: ${res?.error || res?.status}`));
          }
        }
      );
    });

    // Verify session consensus status: 2 of 3 voted, Bob has NOT approved yet
    const sessionStep6 = await sessionStore.getSession(sessionKey);
    const votes = sessionStep6?.consensusVotes || {};
    const approvedCount = Object.values(votes).filter(Boolean).length;
    const totalUsers = sessionStep6?.users.length || 0;

    console.log(`✅ [6.3] Consensus Check: ${approvedCount} of ${totalUsers} seated diners approved (Alice: ✅, Charlie: ✅, Bob: ⏳)`);

    if (approvedCount === 2 && totalUsers === 3 && sessionStep6?.status === "REVIEWING") {
      console.log(`✅ [6.4] Order correctly remains PENDING (Consensus 66.7% < 100%).`);
    } else {
      throw new Error(`Unexpected consensus state: approved=${approvedCount}/${totalUsers}, status=${sessionStep6?.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 7: Bob votes "Looks Good!", verify 100% consensus triggers order creation
    //         and KDS ticket emission
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 7: Bob Votes 'Looks Good!' (100% Consensus & KDS Ticket) ---");

    // KDS Listener for NEW_ORDER_TICKET
    const kdsTicketPromise = new Promise<KdsTicket>((resolve) => {
      clientKds.once("NEW_ORDER_TICKET", (ticket: KdsTicket) => {
        resolve(ticket);
      });
    });

    // Diner Listeners for ORDER_SUBMITTED_SUCCESS
    const aliceSuccessPromise = new Promise<OrderSuccessPayload>((resolve) => {
      clientAlice.once("ORDER_SUBMITTED_SUCCESS", (data: OrderSuccessPayload) => {
        resolve(data);
      });
    });

    const bobSuccessPromise = new Promise<OrderSuccessPayload>((resolve) => {
      clientBob.once("ORDER_SUBMITTED_SUCCESS", (data: OrderSuccessPayload) => {
        resolve(data);
      });
    });

    const charlieSuccessPromise = new Promise<OrderSuccessPayload>((resolve) => {
      clientCharlie.once("ORDER_SUBMITTED_SUCCESS", (data: OrderSuccessPayload) => {
        resolve(data);
      });
    });

    // Bob casts the final deciding vote
    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "SUBMIT_APPROVAL",
        {
          restaurantSlug,
          tableNumber,
          userId: bobId,
          hasApproved: true,
        },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "ORDER_SUBMITTED") {
            console.log(`✅ [7.1] Bob voted 'Looks Good!' -> 100% CONSENSUS REACHED (3/3 Diners)! [Order ID: #${res.orderId}]`);
            resolve();
          } else {
            reject(new Error(`Bob approval failed: ${res?.error || res?.status}`));
          }
        }
      );
    });

    // Await KDS ticket and diner notifications
    const [kdsTicket, aliceSuccess, bobSuccess, charlieSuccess] = await Promise.all([
      kdsTicketPromise,
      aliceSuccessPromise,
      bobSuccessPromise,
      charlieSuccessPromise,
    ]);

    // 7.2 Verify KDS ticket details
    console.log(`✅ [7.2] KDS Station received real-time NEW_ORDER_TICKET!`);
    console.log(`   Order ID: #${kdsTicket.orderId}`);
    console.log(`   Table: ${kdsTicket.tableNumber}, Round: ${kdsTicket.roundNumber}`);
    console.log(`   Items: ${kdsTicket.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`);
    console.log(`   Total: $${(kdsTicket.totalInCents / 100).toFixed(2)}`);

    if (kdsTicket.tableNumber !== 5 || kdsTicket.roundNumber !== 1) {
      throw new Error(`KDS Ticket metadata error: table=${kdsTicket.tableNumber}, round=${kdsTicket.roundNumber}`);
    }
    if (!kdsTicket.items.some((i) => i.name === "Truffle Fries")) {
      throw new Error("KDS Ticket missing 'Truffle Fries'");
    }

    // 7.3 Verify diner notifications & round progression
    console.log(`✅ [7.3] All 3 diners (Alice, Bob, Charlie) received ORDER_SUBMITTED_SUCCESS for Round 1 -> Next: Round ${aliceSuccess.nextRoundNumber}`);

    if (
      aliceSuccess.nextRoundNumber !== 2 ||
      bobSuccess.nextRoundNumber !== 2 ||
      charlieSuccess.nextRoundNumber !== 2
    ) {
      throw new Error("Round number did not increment to 2 across all diners");
    }

    // 7.4 Verify session reset for Round 2
    const sessionStep7 = await sessionStore.getSession(sessionKey);
    if (sessionStep7?.cart.length === 0 && sessionStep7?.roundNumber === 2) {
      console.log(`✅ [7.4] Session verified in Redis: cart cleared, approvals reset, roundNumber = 2.`);
    } else {
      throw new Error("Session was not properly reset for next round in Redis!");
    }

    console.log("\n========================================================================");
    console.log("🎉 ALL MULTI-CLIENT SIMULATION VERIFICATION TESTS PASSED SUCCESSFULLY!");
    console.log("========================================================================\n");

  } finally {
    // Graceful teardown
    for (const socket of allSockets) {
      try {
        socket.disconnect();
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
    console.log("[Teardown] Sockets disconnected, server stopped, Redis and Prisma connections closed.\n");
  }
}

runMultiplayerSimulation()
  .then(() => {
    console.log("Multiplayer simulation script completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Multiplayer simulation failed with error:", err);
    process.exit(1);
  });
