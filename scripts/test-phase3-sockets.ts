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
    cart?: Array<{ id: string; name: string; addedByUserId: string }>;
    roundNumber?: number;
    status?: string;
  };
}

interface UserJoinedEvent {
  user: { id: string; name: string };
}

interface CartUpdatedEvent {
  cart: Array<{ id: string; name: string; addedByUserId: string }>;
}

interface ErrorUnauthorizedEvent {
  error: string;
  message: string;
}

interface ReviewModalEvent {
  triggeredByUserId: string;
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
  };
}

async function runPhase3Tests() {
  console.log("🧪 Starting Phase 3 Real-Time Socket.IO Server Integration Tests...\n");

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  registerSocketHandlers(io);

  const TEST_PORT = 3099;
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Temporary test server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const restaurantSlug = "burger-loft";
  const tableNumber = 4;
  const sessionKey = buildSessionKey(restaurantSlug, tableNumber);

  // Clean session state before testing
  await sessionStore.deleteSession(sessionKey);

  // Connect 3 clients: Alice (Diner 1), Bob (Diner 2), Kitchen (KDS)
  const clientAlice: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientBob: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });
  const clientKds: ClientSocketType = ClientSocket(SERVER_URL, { reconnection: false });

  await Promise.all([
    new Promise<void>((res) => clientAlice.on("connect", () => res())),
    new Promise<void>((res) => clientBob.on("connect", () => res())),
    new Promise<void>((res) => clientKds.on("connect", () => res())),
  ]);

  console.log("✅ All 3 client sockets connected successfully (Alice, Bob, Kitchen Display).");

  try {
    // ------------------------------------------------------------------------
    // TEST 1: KDS joins room:kds:burger-loft
    // ------------------------------------------------------------------------
    console.log("\n1️⃣ Testing JOIN_KDS...");
    await new Promise<void>((resolve, reject) => {
      clientKds.emit("JOIN_KDS", { restaurantSlug }, (res: CallbackResponse) => {
        if (res?.success) {
          console.log(`   ✅ Kitchen Display joined room: ${res.kdsRoom}`);
          resolve();
        } else {
          reject(new Error("Failed to join KDS room"));
        }
      });
    });

    // ------------------------------------------------------------------------
    // TEST 2: Alice and Bob join table 4
    // ------------------------------------------------------------------------
    console.log("\n2️⃣ Testing JOIN_TABLE and USER_JOINED broadcasts...");
    // Alice joins table
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "JOIN_TABLE",
        {
          restaurantSlug,
          tableNumber,
          userId: "user_alice",
          userName: "Alice",
        },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.users?.length === 1) {
            console.log("   ✅ Alice joined Table #4 successfully");
            resolve();
          } else {
            reject(new Error("Alice JOIN_TABLE failed"));
          }
        }
      );
    });

    // Bob joins table, Alice should receive USER_JOINED event
    const aliceReceivedBobJoin = new Promise<void>((resolve) => {
      clientAlice.once("USER_JOINED", (data: UserJoinedEvent) => {
        if (data.user.id === "user_bob" && data.user.name === "Bob") {
          console.log("   ✅ Alice received real-time broadcast: Bob joined the table!");
          resolve();
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "JOIN_TABLE",
        {
          restaurantSlug,
          tableNumber,
          userId: "user_bob",
          userName: "Bob",
        },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.users?.length === 2) {
            console.log("   ✅ Bob joined Table #4 successfully");
            resolve();
          } else {
            reject(new Error("Bob JOIN_TABLE failed"));
          }
        }
      );
    });

    await aliceReceivedBobJoin;

    // ------------------------------------------------------------------------
    // TEST 3: ADD_CART_ITEM (with metadata and broadcast)
    // ------------------------------------------------------------------------
    console.log("\n3️⃣ Testing ADD_CART_ITEM...");
    let aliceCartItemId = "";

    const bobReceivedCartUpdate = new Promise<void>((resolve) => {
      clientBob.once("CART_UPDATED", (data: CartUpdatedEvent) => {
        if (data.cart.length === 1 && data.cart[0].addedByUserId === "user_alice") {
          console.log(`   ✅ Bob received CART_UPDATED broadcast: "${data.cart[0].name}" added by Alice`);
          resolve();
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item_smash_01",
          name: "The Classic Smash",
          priceInCents: 1399,
          quantity: 1,
          selectedModifiers: [{ modifierId: "temp", label: "Medium", priceInCents: 0 }],
        },
        (res: CallbackResponse) => {
          if (res?.success && res.cartItemId) {
            aliceCartItemId = res.cartItemId;
            console.log(`   ✅ Alice added burger to cart (Cart Item ID: ${aliceCartItemId})`);
            resolve();
          } else {
            reject(new Error("Failed to add cart item"));
          }
        }
      );
    });

    await bobReceivedCartUpdate;

    // Bob also adds Fries
    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item_fries_01",
          name: "Parmesan Truffle Fries",
          priceInCents: 799,
          quantity: 1,
        },
        (res: CallbackResponse) => {
          if (res?.success) {
            console.log("   ✅ Bob added truffle fries to cart");
            resolve();
          } else {
            reject(new Error("Bob failed to add fries"));
          }
        }
      );
    });

    // ------------------------------------------------------------------------
    // TEST 4: REMOVE_CART_ITEM (Unauthorized Rejection + Authorized Success)
    // ------------------------------------------------------------------------
    console.log("\n4️⃣ Testing REMOVE_CART_ITEM authorization & ownership check...");

    // Bob attempts to remove Alice's item -> Must be rejected with ERROR_UNAUTHORIZED!
    const bobReceivedUnauthorizedEvent = new Promise<void>((resolve) => {
      clientBob.once("ERROR_UNAUTHORIZED", (data: ErrorUnauthorizedEvent) => {
        if (data.error === "ERROR_UNAUTHORIZED") {
          console.log(`   🛡️ Socket received ERROR_UNAUTHORIZED event: "${data.message}"`);
          resolve();
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "REMOVE_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          cartItemId: aliceCartItemId,
        },
        (res: CallbackResponse) => {
          if (!res?.success && res?.error === "ERROR_UNAUTHORIZED") {
            console.log("   🛡️ Callback returned error: ERROR_UNAUTHORIZED");
            resolve();
          } else {
            reject(new Error("SECURITY FAIL: Unauthorized deletion was not blocked!"));
          }
        }
      );
    });

    await bobReceivedUnauthorizedEvent;

    // Alice removes her own item -> Must succeed!
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "REMOVE_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          cartItemId: aliceCartItemId,
        },
        (res: CallbackResponse) => {
          if (res?.success && res.session?.cart?.length === 1) {
            console.log("   ✅ Alice authorized removal of her own item succeeded");
            resolve();
          } else {
            reject(new Error("Alice authorized removal failed"));
          }
        }
      );
    });

    // Alice puts the burger back so we have 2 items for order submission
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          menuItemId: "item_smash_01",
          name: "The Classic Smash",
          priceInCents: 1399,
          quantity: 1,
        },
        (res: CallbackResponse) => {
          if (res?.success) resolve();
          else reject(new Error("Failed to re-add burger"));
        }
      );
    });

    // ------------------------------------------------------------------------
    // TEST 5: TRIGGER_REVIEW (Sets REVIEWING status & emits REVIEW_MODAL_OPEN)
    // ------------------------------------------------------------------------
    console.log("\n5️⃣ Testing TRIGGER_REVIEW...");
    const bobReceivedReviewModal = new Promise<void>((resolve) => {
      clientBob.once("REVIEW_MODAL_OPEN", (data: ReviewModalEvent) => {
        if (data.triggeredByUserId === "user_alice") {
          console.log("   ✅ Bob received REVIEW_MODAL_OPEN broadcast triggered by Alice");
          resolve();
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientAlice.emit("TRIGGER_REVIEW", { restaurantSlug, tableNumber }, (res: CallbackResponse) => {
        if (res?.success && res.session?.status === "REVIEWING") {
          console.log("   ✅ Table status successfully updated to REVIEWING in Redis");
          resolve();
        } else {
          reject(new Error("Failed to trigger review"));
        }
      });
    });

    await bobReceivedReviewModal;

    // ------------------------------------------------------------------------
    // TEST 6: SUBMIT_APPROVAL & 100% Consensus Order Finalization
    // ------------------------------------------------------------------------
    console.log("\n6️⃣ Testing SUBMIT_APPROVAL & 100% Consensus Ordering...");

    // Alice approves (1 of 2 approved) -> Not 100% yet
    await new Promise<void>((resolve, reject) => {
      clientAlice.emit(
        "SUBMIT_APPROVAL",
        { restaurantSlug, tableNumber, hasApproved: true },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "VOTE_RECORDED") {
            console.log("   ✅ Alice approval recorded (1/2 votes). Order not yet finalized.");
            resolve();
          } else {
            reject(new Error("Alice approval failed"));
          }
        }
      );
    });

    // Set up expectations for when Bob approves (reaching 100% consensus):
    // 1. Kitchen Display System receives NEW_ORDER_TICKET
    const kdsReceivedTicket = new Promise<void>((resolve) => {
      clientKds.once("NEW_ORDER_TICKET", (ticket: OrderTicketEvent) => {
        console.log(`   🛎️ KDS received NEW_ORDER_TICKET! Order ID: ${ticket.orderId}, Items: ${ticket.items.length}, Total: $${(ticket.totalInCents / 100).toFixed(2)}`);
        resolve();
      });
    });

    // 2. Diners at table receive ORDER_SUBMITTED_SUCCESS
    const aliceReceivedOrderSuccess = new Promise<void>((resolve) => {
      clientAlice.once("ORDER_SUBMITTED_SUCCESS", (data: OrderSuccessEvent) => {
        console.log(`   🎉 Alice received ORDER_SUBMITTED_SUCCESS (Round #${data.roundNumber} completed, Next: #${data.nextRoundNumber})`);
        if (data.session.cart.length === 0 && data.session.roundNumber === 2) {
          console.log("   ✅ Redis session verified: cart cleared and roundNumber incremented to 2!");
        }
        resolve();
      });
    });

    // Bob approves -> 100% Consensus!
    await new Promise<void>((resolve, reject) => {
      clientBob.emit(
        "SUBMIT_APPROVAL",
        { restaurantSlug, tableNumber, hasApproved: true },
        (res: CallbackResponse) => {
          if (res?.success && res.status === "ORDER_SUBMITTED") {
            console.log("   🎯 Bob approval triggered 100% consensus and order submission!");
            resolve();
          } else {
            reject(new Error("Bob approval failed to trigger order submission"));
          }
        }
      );
    });

    await Promise.all([kdsReceivedTicket, aliceReceivedOrderSuccess]);

    console.log("\n✨ ALL PHASE 3 REAL-TIME SOCKET.IO TESTS PASSED PERFECTLY! ✨\n");
  } finally {
    clientAlice.disconnect();
    clientBob.disconnect();
    clientKds.disconnect();
    server.close();
    try {
      redis.disconnect();
    } catch {}
    await prisma.$disconnect();
  }
}

runPhase3Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Phase 3 Test failed:", err);
    process.exit(1);
  });
