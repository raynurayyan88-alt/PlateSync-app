import type Redis from "ioredis";
import { redis as defaultRedisClient } from "../lib/redis";

export const SESSION_TTL_SECONDS = 7200; // 2 hours

export interface SessionUser {
  id: string; // unique user identifier
  name: string;
  avatar?: string;
  color?: string;
  joinedAt?: number;
}

export interface SelectedModifierOption {
  modifierId: string;
  label: string;
  priceInRupees?: number;
  priceInCents?: number;
}

export interface CartItem {
  id: string; // unique cart item id (e.g. citem_xxx)
  menuItemId: string;
  name: string;
  priceInRupees?: number;
  priceInCents: number;
  quantity: number;
  selectedModifiers?: SelectedModifierOption[] | Record<string, unknown>;
  notes?: string;
  addedByUserId: string; // strictly tracks ownership of the item
  addedByUserName?: string;
  createdAt?: number;
}

export type TableStatus = "IDLE" | "REVIEWING" | "LOCKED" | "AWAITING_PAYMENT";

export interface SubmittedRound {
  roundNumber: number;
  orderId: string;
  items: CartItem[];
  roundTotalInRupees: number;
  roundTotalInCents: number;
  placedAt: string;
  approvedBy: string[];
}

export interface TableSession {
  diningSessionId: string; // Unique per customer group
  restaurantSlug: string;
  tableNumber: number;
  users: SessionUser[];
  cart: CartItem[];
  consensusVotes: Record<string, boolean>; // userId -> hasApproved
  roundNumber: number;
  status: TableStatus;
  submittedRounds: SubmittedRound[];
  tableGrandTotalInRupees: number;
  tableGrandTotalInCents: number;
  isClosed?: boolean;
  closedAt?: string;
  createdAt: number;
  updatedAt: number;
}

export function generateDiningSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export type BillStatus = "DINING" | "AWAITING_PAYMENT" | "PAID";

export interface CashierBill {
  billId: string;
  diningSessionId: string;
  restaurantSlug: string;
  tableNumber: number;
  guestNames: string[];
  rounds: SubmittedRound[];
  grandTotalInRupees: number;
  grandTotalInCents: number;
  billStatus: BillStatus;
  createdAt: string;
  closedAt?: string;
}

export function generateBillId(tableNumber: number | string, diningSessionId: string): string {
  const shortId = diningSessionId.replace(/^sess_/, "").slice(-4).toUpperCase();
  return `BILL-${tableNumber}-${shortId}`;
}

export interface CompletedTableBill {
  billId?: string;
  diningSessionId: string;
  restaurantSlug: string;
  tableNumber: number;
  guests: string[];
  guestNames?: string[];
  rounds: SubmittedRound[];
  grandTotalInRupees: number;
  grandTotalInCents: number;
  closedAt: string;
  billStatus?: BillStatus;
}

// In-memory queue for pending cashier bills per restaurant (e.g. at washbasin/counter awaiting payment)
export const pendingBillsBuffer: Map<string, CashierBill[]> = new Map();

// In-memory buffer for completed cashier bills per restaurant
export const completedBillsBuffer: Map<string, CashierBill[]> = new Map();

/**
 * Generates the standardized Redis session key: session:{restaurantSlug}:{tableNumber}
 */
export function buildSessionKey(restaurantSlug: string, tableNumber: number | string): string {
  return `session:${restaurantSlug.trim().toLowerCase()}:${tableNumber}`;
}

// In-memory fallback cache to allow zero-downtime local testing when Redis server is offline
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export class SessionStore {
  private redis: Redis;

  constructor(redisClient: Redis = defaultRedisClient) {
    this.redis = redisClient;
  }

  /**
   * Safe read from Redis with in-memory fallback (<80ms fast-fail)
   */
  private async readSessionRaw(sessionKey: string): Promise<string | null> {
    try {
      if (this.redis.status === "ready") {
        const data = await Promise.race([
          this.redis.get(sessionKey),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 80)),
        ]);
        if (data) return data;
      }
    } catch {
      // Redis is not connected or timed out, fall back to memoryCache instantly
    }

    const cached = memoryCache.get(sessionKey);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        memoryCache.delete(sessionKey);
        return null;
      }
      return cached.value;
    }

    return null;
  }

  /**
   * Safe write to Redis with 7200s TTL and instant memory store
   */
  private async writeSessionRaw(sessionKey: string, serializedSession: string): Promise<void> {
    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
    // Always write to fast in-memory store first
    memoryCache.set(sessionKey, { value: serializedSession, expiresAt });

    try {
      if (this.redis.status === "ready") {
        // Non-blocking fire-and-forget Redis sync
        Promise.race([
          this.redis.set(sessionKey, serializedSession, "EX", SESSION_TTL_SECONDS),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
        ]).catch(() => {});
      }
    } catch {
      // Redis offline; state remains securely in memoryCache
    }
  }

  /**
   * Get an existing session or initialize a fresh one with 7200s TTL
   */
  async getOrCreateSession(
    restaurantSlug: string,
    tableNumber: number | string
  ): Promise<TableSession> {
    const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
    const existingRaw = await this.readSessionRaw(sessionKey);

    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw) as TableSession;
        if (!parsed.status) parsed.status = "IDLE";
        if (!parsed.diningSessionId) parsed.diningSessionId = generateDiningSessionId();
        if (!parsed.submittedRounds) parsed.submittedRounds = [];
        if (parsed.tableGrandTotalInRupees === undefined) {
          parsed.tableGrandTotalInRupees = parsed.submittedRounds.reduce(
            (sum, r) => sum + (r.roundTotalInRupees || 0),
            0
          );
        }
        if (parsed.tableGrandTotalInCents === undefined) {
          parsed.tableGrandTotalInCents = parsed.submittedRounds.reduce(
            (sum, r) => sum + (r.roundTotalInCents || 0),
            0
          );
        }
        return parsed;
      } catch {
        // Parse error, re-create session below
      }
    }

    const newSession: TableSession = {
      diningSessionId: generateDiningSessionId(),
      restaurantSlug: restaurantSlug.trim().toLowerCase(),
      tableNumber: Number(tableNumber),
      users: [],
      cart: [],
      consensusVotes: {},
      roundNumber: 1,
      status: "IDLE",
      submittedRounds: [],
      tableGrandTotalInRupees: 0,
      tableGrandTotalInCents: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.writeSessionRaw(sessionKey, JSON.stringify(newSession));
    return newSession;
  }

  /**
   * Retrieve session by key
   */
  async getSession(sessionKey: string): Promise<TableSession | null> {
    const raw = await this.readSessionRaw(sessionKey);
    if (!raw) return null;
    return JSON.parse(raw) as TableSession;
  }

  /**
   * Add a user to the session (idempotent; updates user if already present)
   */
  async addUser(sessionKey: string, userObj: SessionUser): Promise<TableSession> {
    let session = await this.getSession(sessionKey);
    if (!session) {
      // Parse key if possible to create session
      const parts = sessionKey.split(":");
      if (parts.length >= 3) {
        session = await this.getOrCreateSession(parts[1], parts[2]);
      } else {
        throw new Error(`Session not found for key: ${sessionKey}`);
      }
    }

    const existingIdx = session.users.findIndex((u) => u.id === userObj.id);
    const userToSave: SessionUser = {
      ...userObj,
      joinedAt: userObj.joinedAt || Date.now(),
    };

    if (existingIdx >= 0) {
      session.users[existingIdx] = { ...session.users[existingIdx], ...userToSave };
    } else {
      session.users.push(userToSave);
    }

    session.updatedAt = Date.now();
    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Remove a user from the session and delete their vote
   */
  async removeUser(sessionKey: string, userId: string): Promise<TableSession> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    session.users = session.users.filter((u) => u.id !== userId);
    delete session.consensusVotes[userId];
    session.updatedAt = Date.now();

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Add a cart item to the session
   * Resets consensus votes so all diners review cart changes
   */
  async addItem(sessionKey: string, cartItem: CartItem): Promise<TableSession> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    const item: CartItem = {
      ...cartItem,
      id: cartItem.id || `citem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: cartItem.createdAt || Date.now(),
    };

    session.cart.push(item);
    session.consensusVotes = {}; // Invalidate votes on cart mutation
    session.updatedAt = Date.now();

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Remove a cart item from the session
   * STRICT REQUIREMENT: Only the user who added this item (addedByUserId) can remove it!
   */
  async removeItem(
    sessionKey: string,
    cartItemId: string,
    requestingUserId: string
  ): Promise<TableSession> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    const itemIndex = session.cart.findIndex((i) => i.id === cartItemId);
    if (itemIndex === -1) {
      throw new Error(`Cart item "${cartItemId}" not found in session.`);
    }

    const item = session.cart[itemIndex];

    // STRICT OWNER CHECK: Prevent deletion if requestingUserId does not match item.addedByUserId
    if (item.addedByUserId !== requestingUserId) {
      throw new Error(
        `Permission denied: Only the user who added this item (${item.addedByUserId}) can remove it. Request from user (${requestingUserId}) was rejected.`
      );
    }

    session.cart.splice(itemIndex, 1);
    session.consensusVotes = {}; // Invalidate votes on cart mutation
    session.updatedAt = Date.now();

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Record or update a diner's consensus approval vote
   */
  async updateConsensusVote(
    sessionKey: string,
    userId: string,
    hasApproved: boolean
  ): Promise<TableSession> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    session.consensusVotes[userId] = hasApproved;
    session.updatedAt = Date.now();

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Reset the session for the next round
   * Records the submitted round, increments roundNumber, clears cart and votes, resets status to IDLE, while preserving connected users
   */
  async resetForNextRound(sessionKey: string, submittedRound?: SubmittedRound): Promise<TableSession> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    if (submittedRound) {
      if (!session.submittedRounds) {
        session.submittedRounds = [];
      }
      session.submittedRounds.push(submittedRound);
      session.tableGrandTotalInRupees = session.submittedRounds.reduce(
        (sum, r) => sum + (r.roundTotalInRupees || 0),
        0
      );
      session.tableGrandTotalInCents = session.submittedRounds.reduce(
        (sum, r) => sum + (r.roundTotalInCents || 0),
        0
      );
    }

    session.cart = [];
    session.consensusVotes = {};
    session.roundNumber = (session.roundNumber || 1) + 1;
    session.status = "IDLE";
    session.updatedAt = Date.now();

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Closes out the current dining session and generates a fresh session for the next customer group
   */
  async closeAndResetTable(
    sessionKey: string
  ): Promise<{ previousBill?: CashierBill; newSession: TableSession }> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    let previousBill: CashierBill | undefined;

    // If there were submitted rounds or items, archive to completed bills
    if ((session.submittedRounds && session.submittedRounds.length > 0) || session.cart.length > 0) {
      previousBill = {
        billId: generateBillId(session.tableNumber, session.diningSessionId),
        diningSessionId: session.diningSessionId,
        restaurantSlug: session.restaurantSlug,
        tableNumber: session.tableNumber,
        guestNames: session.users.map((u) => u.name),
        rounds: [...(session.submittedRounds || [])],
        grandTotalInRupees: session.tableGrandTotalInRupees || 0,
        grandTotalInCents: session.tableGrandTotalInCents || 0,
        billStatus: "PAID",
        createdAt: new Date(session.createdAt || Date.now()).toISOString(),
        closedAt: new Date().toISOString(),
      };

      const slugKey = session.restaurantSlug.trim().toLowerCase();
      const existingBills = completedBillsBuffer.get(slugKey) || [];
      existingBills.unshift(previousBill);
      if (existingBills.length > 50) existingBills.pop();
      completedBillsBuffer.set(slugKey, existingBills);
    }

    // Generate brand-new dining session for the next customer group
    const newSession: TableSession = {
      diningSessionId: generateDiningSessionId(),
      restaurantSlug: session.restaurantSlug,
      tableNumber: session.tableNumber,
      users: [],
      cart: [],
      consensusVotes: {},
      roundNumber: 1,
      status: "IDLE",
      submittedRounds: [],
      tableGrandTotalInRupees: 0,
      tableGrandTotalInCents: 0,
      isClosed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.writeSessionRaw(sessionKey, JSON.stringify(newSession));
    return { previousBill, newSession };
  }

  /**
   * Retrieves all active table sessions for a given restaurant
   */
  async getAllSessionsForRestaurant(restaurantSlug: string): Promise<TableSession[]> {
    const slugKey = restaurantSlug.trim().toLowerCase();
    const prefix = `session:${slugKey}:`;
    const sessionKeys = new Set<string>();

    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        sessionKeys.add(key);
      }
    }

    try {
      if (this.redis.status === "ready") {
        const redisKeys = await Promise.race([
          this.redis.keys(`${prefix}*`),
          new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 80)),
        ]);
        if (Array.isArray(redisKeys)) {
          for (const k of redisKeys) {
            sessionKeys.add(k);
          }
        }
      }
    } catch {
      // Redis offline/slow, memoryCache is sufficient
    }

    const sessions: TableSession[] = [];
    for (const key of sessionKeys) {
      const sess = await this.getSession(key);
      if (sess) {
        sessions.push(sess);
      }
    }

    sessions.sort((a, b) => a.tableNumber - b.tableNumber);
    return sessions;
  }

  /**
   * Moves a customer group's session to AWAITING_PAYMENT when they request their bill
   * Preserves their consolidated bill in pendingBillsBuffer for the cashier
   */
  async requestFinalBill(
    sessionKey: string
  ): Promise<{ bill: CashierBill; session: TableSession }> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    session.status = "AWAITING_PAYMENT";
    session.updatedAt = Date.now();

    const slugKey = session.restaurantSlug.trim().toLowerCase();
    const billId = generateBillId(session.tableNumber, session.diningSessionId);

    const bill: CashierBill = {
      billId,
      diningSessionId: session.diningSessionId,
      restaurantSlug: session.restaurantSlug,
      tableNumber: session.tableNumber,
      guestNames: session.users.map((u) => u.name),
      rounds: [...(session.submittedRounds || [])],
      grandTotalInRupees: session.tableGrandTotalInRupees || 0,
      grandTotalInCents: session.tableGrandTotalInCents || 0,
      billStatus: "AWAITING_PAYMENT",
      createdAt: new Date(session.createdAt || Date.now()).toISOString(),
    };

    const pending = pendingBillsBuffer.get(slugKey) || [];
    const existingIdx = pending.findIndex((b) => b.diningSessionId === session.diningSessionId);
    if (existingIdx >= 0) {
      pending[existingIdx] = bill;
    } else {
      pending.unshift(bill);
    }
    pendingBillsBuffer.set(slugKey, pending);

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return { bill, session };
  }

  /**
   * Starts a brand-new customer group at a table while preserving the previous group's bill
   * in the cashier's AWAITING_PAYMENT queue (e.g. while previous group is washing hands/paying)
   */
  async startNewCustomerGroup(
    sessionKey: string
  ): Promise<{ previousBill?: CashierBill; newSession: TableSession }> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    const slugKey = session.restaurantSlug.trim().toLowerCase();
    let previousBill: CashierBill | undefined;

    // If previous customer group had placed rounds or items, preserve their bill in AWAITING_PAYMENT
    if ((session.submittedRounds && session.submittedRounds.length > 0) || session.cart.length > 0) {
      previousBill = {
        billId: generateBillId(session.tableNumber, session.diningSessionId),
        diningSessionId: session.diningSessionId,
        restaurantSlug: session.restaurantSlug,
        tableNumber: session.tableNumber,
        guestNames: session.users.map((u) => u.name),
        rounds: [...(session.submittedRounds || [])],
        grandTotalInRupees: session.tableGrandTotalInRupees || 0,
        grandTotalInCents: session.tableGrandTotalInCents || 0,
        billStatus: "AWAITING_PAYMENT",
        createdAt: new Date(session.createdAt || Date.now()).toISOString(),
      };

      const pending = pendingBillsBuffer.get(slugKey) || [];
      const existingIdx = pending.findIndex((b) => b.diningSessionId === session.diningSessionId);
      if (existingIdx >= 0) {
        pending[existingIdx] = previousBill;
      } else {
        pending.unshift(previousBill);
      }
      pendingBillsBuffer.set(slugKey, pending);
    }

    // Immediately allocate fresh Round 1 session for the new customer group
    const newSession: TableSession = {
      diningSessionId: generateDiningSessionId(),
      restaurantSlug: session.restaurantSlug,
      tableNumber: session.tableNumber,
      users: [],
      cart: [],
      consensusVotes: {},
      roundNumber: 1,
      status: "IDLE",
      submittedRounds: [],
      tableGrandTotalInRupees: 0,
      tableGrandTotalInCents: 0,
      isClosed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.writeSessionRaw(sessionKey, JSON.stringify(newSession));
    return { previousBill, newSession };
  }

  /**
   * Marks a specific bill as PAID by the cashier.
   * If this bill was for an older customer group while a new group is already dining at the table,
   * it settles that bill without disrupting the new group's active session!
   */
  async markBillPaid(
    restaurantSlug: string,
    billId: string
  ): Promise<{ paidBill?: CashierBill; isCurrentSession: boolean; newSession?: TableSession }> {
    const slugKey = restaurantSlug.trim().toLowerCase();
    const pending = pendingBillsBuffer.get(slugKey) || [];
    const billIndex = pending.findIndex((b) => b.billId === billId);
    let targetBill: CashierBill | undefined;

    if (billIndex >= 0) {
      targetBill = pending[billIndex];
      pending.splice(billIndex, 1);
      pendingBillsBuffer.set(slugKey, pending);
    } else {
      // Look in active sessions to see if currently dining bill is being paid directly
      const activeSessions = await this.getAllSessionsForRestaurant(slugKey);
      for (const s of activeSessions) {
        if (generateBillId(s.tableNumber, s.diningSessionId) === billId) {
          targetBill = {
            billId,
            diningSessionId: s.diningSessionId,
            restaurantSlug: s.restaurantSlug,
            tableNumber: s.tableNumber,
            guestNames: s.users.map((u) => u.name),
            rounds: [...(s.submittedRounds || [])],
            grandTotalInRupees: s.tableGrandTotalInRupees || 0,
            grandTotalInCents: s.tableGrandTotalInCents || 0,
            billStatus: "DINING",
            createdAt: new Date(s.createdAt || Date.now()).toISOString(),
          };
          break;
        }
      }
    }

    if (!targetBill) {
      return { isCurrentSession: false };
    }

    targetBill.billStatus = "PAID";
    targetBill.closedAt = new Date().toISOString();

    // Archive into completed bills buffer
    const completed = completedBillsBuffer.get(slugKey) || [];
    completed.unshift(targetBill);
    if (completed.length > 50) completed.pop();
    completedBillsBuffer.set(slugKey, completed);

    // Check if this was the active session currently dining on that table
    const sessionKey = buildSessionKey(slugKey, targetBill.tableNumber);
    const currentSession = await this.getSession(sessionKey);
    let isCurrentSession = false;
    let newSession: TableSession | undefined;

    if (currentSession && currentSession.diningSessionId === targetBill.diningSessionId) {
      // Current group finished and paid; reset table
      isCurrentSession = true;
      const resetRes = await this.closeAndResetTable(sessionKey);
      newSession = resetRes.newSession;
    } else {
      // Previous customer group was paying while a new group is already seated.
      // Do NOT reset the active session!
      isCurrentSession = false;
    }

    return { paidBill: targetBill, isCurrentSession, newSession };
  }

  /**
   * Returns all cashier bills: pending AWAITING_PAYMENT bills at counter + active DINING bills
   */
  async getAllCashierBills(restaurantSlug: string): Promise<CashierBill[]> {
    const slugKey = restaurantSlug.trim().toLowerCase();
    const pending = pendingBillsBuffer.get(slugKey) || [];
    const activeSessions = await this.getAllSessionsForRestaurant(slugKey);
    const result: CashierBill[] = [...pending];

    for (const session of activeSessions) {
      if ((session.submittedRounds && session.submittedRounds.length > 0) || session.cart.length > 0) {
        const alreadyInPending = result.some((b) => b.diningSessionId === session.diningSessionId);
        if (!alreadyInPending) {
          result.push({
            billId: generateBillId(session.tableNumber, session.diningSessionId),
            diningSessionId: session.diningSessionId,
            restaurantSlug: session.restaurantSlug,
            tableNumber: session.tableNumber,
            guestNames: session.users.map((u) => u.name),
            rounds: session.submittedRounds || [],
            grandTotalInRupees: session.tableGrandTotalInRupees || 0,
            grandTotalInCents: session.tableGrandTotalInCents || 0,
            billStatus: session.status === "AWAITING_PAYMENT" ? "AWAITING_PAYMENT" : "DINING",
            createdAt: new Date(session.createdAt || Date.now()).toISOString(),
          });
        }
      }
    }

    result.sort((a, b) => {
      if (a.billStatus === "AWAITING_PAYMENT" && b.billStatus !== "AWAITING_PAYMENT") return -1;
      if (a.billStatus !== "AWAITING_PAYMENT" && b.billStatus === "AWAITING_PAYMENT") return 1;
      return a.tableNumber - b.tableNumber;
    });

    return result;
  }

  /**
   * Update the table session status (IDLE, REVIEWING, LOCKED, AWAITING_PAYMENT)
   */
  async setSessionStatus(sessionKey: string, status: TableStatus): Promise<TableSession> {
    const session = await this.getSession(sessionKey);
    if (!session) {
      throw new Error(`Session not found for key: ${sessionKey}`);
    }

    session.status = status;
    session.updatedAt = Date.now();

    await this.writeSessionRaw(sessionKey, JSON.stringify(session));
    return session;
  }

  /**
   * Purge session from Redis & memory
   */
  async deleteSession(sessionKey: string): Promise<void> {
    memoryCache.delete(sessionKey);
    try {
      if (this.redis.status === "ready") {
        await this.redis.del(sessionKey);
      }
    } catch {
      // Ignored
    }
  }
}

// Default singleton instance
export const sessionStore = new SessionStore();

// Standalone functions matching the user's exact naming specifications
export const getOrCreateSession = (restaurantSlug: string, tableNumber: number | string) =>
  sessionStore.getOrCreateSession(restaurantSlug, tableNumber);

export const addUser = (sessionKey: string, userObj: SessionUser) =>
  sessionStore.addUser(sessionKey, userObj);

export const removeUser = (sessionKey: string, userId: string) =>
  sessionStore.removeUser(sessionKey, userId);

export const addItem = (sessionKey: string, cartItem: CartItem) =>
  sessionStore.addItem(sessionKey, cartItem);

export const removeItem = (sessionKey: string, cartItemId: string, requestingUserId: string) =>
  sessionStore.removeItem(sessionKey, cartItemId, requestingUserId);

export const updateConsensusVote = (sessionKey: string, userId: string, hasApproved: boolean) =>
  sessionStore.updateConsensusVote(sessionKey, userId, hasApproved);

export const resetForNextRound = (sessionKey: string, submittedRound?: SubmittedRound) =>
  sessionStore.resetForNextRound(sessionKey, submittedRound);

export const closeAndResetTable = (sessionKey: string) =>
  sessionStore.closeAndResetTable(sessionKey);

export const requestFinalBill = (sessionKey: string) =>
  sessionStore.requestFinalBill(sessionKey);

export const startNewCustomerGroup = (sessionKey: string) =>
  sessionStore.startNewCustomerGroup(sessionKey);

export const markBillPaid = (restaurantSlug: string, billId: string) =>
  sessionStore.markBillPaid(restaurantSlug, billId);

export const getAllCashierBills = (restaurantSlug: string) =>
  sessionStore.getAllCashierBills(restaurantSlug);

export const getPendingBills = (restaurantSlug: string): CashierBill[] =>
  pendingBillsBuffer.get(restaurantSlug.trim().toLowerCase()) || [];

export const getAllSessionsForRestaurant = (restaurantSlug: string) =>
  sessionStore.getAllSessionsForRestaurant(restaurantSlug);

export const getCompletedBills = (restaurantSlug: string): CashierBill[] =>
  completedBillsBuffer.get(restaurantSlug.trim().toLowerCase()) || [];

export const setSessionStatus = (sessionKey: string, status: TableStatus) =>
  sessionStore.setSessionStatus(sessionKey, status);

export default sessionStore;


