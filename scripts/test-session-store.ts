import {
  buildSessionKey,
  getOrCreateSession,
  addUser,
  removeUser,
  addItem,
  removeItem,
  updateConsensusVote,
  resetForNextRound,
  sessionStore,
} from "../src/server/sessionStore";
import { redis } from "../src/lib/redis";

async function runSessionStoreTests() {
  console.log("🧪 Running PlateSync Session Store Verification Tests...\n");

  const slug = "burger-loft";
  const table = 4;
  const sessionKey = buildSessionKey(slug, table);

  // Clean up any existing test session first
  await sessionStore.deleteSession(sessionKey);

  // 1. Test getOrCreateSession
  console.log("1️⃣ Testing getOrCreateSession...");
  const session1 = await getOrCreateSession(slug, table);
  if (session1.restaurantSlug !== "burger-loft" || session1.tableNumber !== 4) {
    throw new Error("Failed to initialize session with correct slug/table");
  }
  if (session1.roundNumber !== 1 || session1.cart.length !== 0 || session1.users.length !== 0) {
    throw new Error("Initial session state is incorrect");
  }
  console.log("   ✅ Initialized session:", sessionKey);

  // 2. Test addUser
  console.log("\n2️⃣ Testing addUser...");
  await addUser(sessionKey, { id: "user_alice", name: "Alice", color: "#f59e0b" });
  const sessionWithBob = await addUser(sessionKey, { id: "user_bob", name: "Bob", color: "#3b82f6" });
  if (sessionWithBob.users.length !== 2) {
    throw new Error(`Expected 2 users, found ${sessionWithBob.users.length}`);
  }
  console.log("   ✅ Users joined table:", sessionWithBob.users.map((u) => u.name).join(", "));

  // 3. Test addItem
  console.log("\n3️⃣ Testing addItem...");
  const itemAlice = {
    id: "citem_alice_burger",
    menuItemId: "item_smash_01",
    name: "The Classic Smash",
    priceInCents: 1399,
    quantity: 1,
    addedByUserId: "user_alice",
    addedByUserName: "Alice",
  };
  const itemBob = {
    id: "citem_bob_fries",
    menuItemId: "item_fries_01",
    name: "Parmesan Truffle Fries",
    priceInCents: 799,
    quantity: 1,
    addedByUserId: "user_bob",
    addedByUserName: "Bob",
  };

  await addItem(sessionKey, itemAlice);
  const sessionWithItems = await addItem(sessionKey, itemBob);
  if (sessionWithItems.cart.length !== 2) {
    throw new Error(`Expected 2 items in cart, found ${sessionWithItems.cart.length}`);
  }
  console.log("   ✅ Cart populated with 2 items from Alice and Bob");

  // 4. Test removeItem STRICT SECURITY RULE: Unauthorized deletion attempt
  console.log("\n4️⃣ Testing removeItem authorization check...");
  let unauthorizedErrorCaught = false;
  try {
    // Bob attempts to remove Alice's burger!
    await removeItem(sessionKey, "citem_alice_burger", "user_bob");
  } catch (err: unknown) {
    unauthorizedErrorCaught = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`   🛡️ Correctly blocked unauthorized deletion: "${msg}"`);
  }

  if (!unauthorizedErrorCaught) {
    throw new Error("SECURITY FAILURE: Bob was able to delete Alice's cart item!");
  }

  // Authorized deletion: Alice removes her own burger
  const sessionAfterAliceRemove = await removeItem(sessionKey, "citem_alice_burger", "user_alice");
  if (sessionAfterAliceRemove.cart.length !== 1 || sessionAfterAliceRemove.cart[0].id !== "citem_bob_fries") {
    throw new Error("Failed to remove item by owner");
  }
  console.log("   ✅ Authorized item deletion by owner succeeded");

  // 5. Test updateConsensusVote
  console.log("\n5️⃣ Testing updateConsensusVote...");
  await updateConsensusVote(sessionKey, "user_alice", true);
  const sessionVoted = await updateConsensusVote(sessionKey, "user_bob", true);
  if (sessionVoted.consensusVotes["user_alice"] !== true || sessionVoted.consensusVotes["user_bob"] !== true) {
    throw new Error("Consensus votes were not recorded properly");
  }
  console.log("   ✅ Consensus votes recorded:", sessionVoted.consensusVotes);

  // 6. Test resetForNextRound
  console.log("\n6️⃣ Testing resetForNextRound...");
  const sessionRound2 = await resetForNextRound(sessionKey);
  if (sessionRound2.roundNumber !== 2) {
    throw new Error(`Expected roundNumber 2, got ${sessionRound2.roundNumber}`);
  }
  if (sessionRound2.cart.length !== 0) {
    throw new Error("Cart was not cleared for next round");
  }
  if (Object.keys(sessionRound2.consensusVotes).length !== 0) {
    throw new Error("Consensus votes were not cleared for next round");
  }
  if (sessionRound2.users.length !== 2) {
    throw new Error("Users must be preserved across rounds!");
  }
  console.log(`   ✅ Table advanced to Round #${sessionRound2.roundNumber} with empty cart & votes, preserving ${sessionRound2.users.length} diners`);

  // 7. Test removeUser
  console.log("\n7️⃣ Testing removeUser...");
  const sessionAfterBobLeaves = await removeUser(sessionKey, "user_bob");
  if (sessionAfterBobLeaves.users.length !== 1 || sessionAfterBobLeaves.users[0].id !== "user_alice") {
    throw new Error("Failed to remove Bob from session");
  }
  console.log("   ✅ Bob left the table. Remaining diners:", sessionAfterBobLeaves.users.map((u) => u.name).join(", "));

  console.log("\n✨ ALL SESSION STORE TESTS PASSED PERFECTLY! ✨\n");
}

runSessionStoreTests()
  .then(() => {
    try {
      redis.disconnect();
    } catch {}
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test failed:", err);
    try {
      redis.disconnect();
    } catch {}
    process.exit(1);
  });
