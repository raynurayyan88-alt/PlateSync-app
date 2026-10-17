"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Receipt,
  CreditCard,
} from "lucide-react";
import { ClientMenuItem, ClientMenuCategory } from "../../lib/menu";
import { getSocketClient } from "../../lib/socket-client";
import { TableSession, CartItem } from "../../server/sessionStore";
import OnboardingModal, { UserProfile } from "./OnboardingModal";
import MenuBrowser from "./MenuBrowser";
import ItemCustomizerDrawer from "./ItemCustomizerDrawer";
import LiveCartBar from "./LiveCartBar";
import ConsensusModal from "./ConsensusModal";
import NetworkResilienceOverlay from "./NetworkResilienceOverlay";
import LiveTablePill from "./LiveTablePill";
import ReceiptEdge from "../ui/ReceiptEdge";
import { getGuestSignatureColor } from "../../lib/palette";

interface GuestTableClientProps {
  restaurantSlug: string;
  restaurantName: string;
  tableNumber: number;
  initialMenuItems: ClientMenuItem[];
  categories?: ClientMenuCategory[];
}

/**
 * Safely merges the authoritative server cart with any recent local optimistic items
 * that haven't reached the server yet (<4s old), ensuring zero item dropouts when
 * multiple friends simultaneously add dishes.
 */
function mergeServerCart(
  prevCart: CartItem[],
  serverCart: CartItem[],
  currentUserId?: string
): CartItem[] {
  const serverIds = new Set(serverCart.map((i) => i.id));
  const recentLocalPending = prevCart.filter(
    (item) =>
      item.addedByUserId === currentUserId &&
      !serverIds.has(item.id) &&
      Date.now() - (item.createdAt || 0) < 4000
  );
  return [...serverCart, ...recentLocalPending];
}

export default function GuestTableClient({
  restaurantSlug,
  restaurantName,
  tableNumber,
  initialMenuItems,
  categories,
}: GuestTableClientProps) {
  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [joinedDiningSessionId, setJoinedDiningSessionId] = useState<string | null>(null);
  const [isTableClosed, setIsTableClosed] = useState(false);
  const joinedDiningSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    joinedDiningSessionIdRef.current = joinedDiningSessionId;
  }, [joinedDiningSessionId]);

  // Table session
  const [session, setSession] = useState<TableSession>({
    diningSessionId: "",
    restaurantSlug,
    tableNumber,
    users: [],
    cart: [],
    approvals: [],
    consensusVotes: {},
    roundNumber: 1,
    status: "IDLE",
    submittedRounds: [],
    tableGrandTotalInRupees: 0,
    tableGrandTotalInCents: 0,
    orderPlaced: false,
    createdAt: 0,
    updatedAt: 0,
  });

  // Track rounds that have already shown the celebration modal on this device
  const celebratedRoundsRef = useRef<Set<number>>(new Set());

  // Network & Connectivity state
  const [_isSocketConnected, setIsSocketConnected] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  // Computed network disconnect state ("Bad WiFi" Safeguard)
  // NEVER block onboarding, and allow single-port HTTP sync even if WebSocket is disconnected
  const isDisconnected = Boolean(userProfile && !isOnboardingOpen && !isBrowserOnline);

  const [activeItemForCustomization, setActiveItemForCustomization] = useState<ClientMenuItem | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{
    orderId: string;
    roundNumber: number;
    totalInCents: number;
  } | null>(null);

  // Auto-dismiss celebration screen after 4 seconds and transition to the fresh cart for the next round
  useEffect(() => {
    if (lastPlacedOrder) {
      const timer = setTimeout(() => {
        setLastPlacedOrder(null);
        setIsReviewModalOpen(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastPlacedOrder]);

  // Signature Presence States (Avatar pulse & lightweight toast pill)
  const [pulsingUserId, setPulsingUserId] = useState<string | null>(null);
  const [liveItemToast, setLiveItemToast] = useState<{
    userId: string;
    userName: string;
    itemName: string;
    userColor: string;
  } | null>(null);

  // Helper to trigger Live Table Pill avatar pulse & lightweight sliding toast pill
  const triggerItemAddedAnimation = useCallback(
    (userId: string, userName: string, itemName: string) => {
      const palette = getGuestSignatureColor(userId);
      setPulsingUserId(userId);
      setLiveItemToast({
        userId,
        userName,
        itemName,
        userColor: palette.hex,
      });

      setTimeout(() => {
        setPulsingUserId((curr) => (curr === userId ? null : curr));
      }, 850);

      setTimeout(() => {
        setLiveItemToast((curr) =>
          curr?.userId === userId && curr?.itemName === itemName ? null : curr
        );
      }, 2600);
    },
    []
  );

  // Ref to track user profile without stale closures inside socket events
  const userProfileRef = useRef<UserProfile | null>(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // Show toast notification helper
  const showToast = useCallback((text: string, type: "info" | "success" | "error" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // 1. Emit JOIN_TABLE helper
  const emitJoinTable = useCallback((profile: UserProfile) => {
    const socket = getSocketClient();
    socket.emit(
      "JOIN_TABLE",
      {
        restaurantSlug,
        tableNumber,
        userId: profile.userId,
        userName: profile.userName,
        color: profile.color,
      },
      (res: { success?: boolean; session?: TableSession }) => {
        if (res?.success && res.session) {
          setSession((prev) => ({
            ...res.session!,
            cart: mergeServerCart(prev.cart, res.session!.cart, profile.userId),
          }));
          if (res.session.diningSessionId) {
            setJoinedDiningSessionId(res.session.diningSessionId);
          }
          if (res.session.status === "CLOSED" || res.session.billStatus === "PAID") {
            setIsTableClosed(true);
          } else {
            setIsTableClosed(false);
          }
        }
      }
    );
  }, [restaurantSlug, tableNumber]);

  // 2. Authoritative Redis State Fetcher on Reconnect
  const fetchAuthoritativeRedisState = useCallback(() => {
    const socket = getSocketClient();
    const currentProf = userProfileRef.current;

    if (currentProf) {
      console.log("[Resilience] Reconnected! Resuming authoritative session from Redis via JOIN_TABLE...");
      emitJoinTable(currentProf);
    } else {
      console.log("[Resilience] Reconnected! Fetching authoritative session via REQUEST_SYNC...");
      socket.emit(
        "REQUEST_SYNC",
        { restaurantSlug, tableNumber },
        (res: { success?: boolean; session?: TableSession }) => {
          if (res?.success && res.session) {
            setSession((prev) => ({
              ...res.session!,
              cart: mergeServerCart(prev.cart, res.session!.cart, undefined),
            }));
            if (res.session.diningSessionId) {
              setJoinedDiningSessionId(res.session.diningSessionId);
            }
            if (res.session.status === "CLOSED" || res.session.billStatus === "PAID") {
              setIsTableClosed(true);
            } else {
              setIsTableClosed(false);
            }
          }
        }
      );
    }
  }, [emitJoinTable, restaurantSlug, tableNumber]);

  // 3. Browser Online/Offline listener
  useEffect(() => {
    function handleOnline() {
      setIsBrowserOnline(true);
      const socket = getSocketClient();
      if (!socket.connected) {
        socket.connect();
      } else {
        fetchAuthoritativeRedisState();
      }
    }

    function handleOffline() {
      setIsBrowserOnline(false);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [fetchAuthoritativeRedisState]);

  // 4. Check local storage for user profile on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      const savedName =
        localStorage.getItem("platesync_user_name") || localStorage.getItem("tablesync_user_name");
      const savedId =
        localStorage.getItem("platesync_user_id") || localStorage.getItem("tablesync_user_id");
      const savedColor =
        localStorage.getItem("platesync_user_color") ||
        localStorage.getItem("tablesync_user_color") ||
        "#f59e0b";

      if (savedName && savedId) {
        queueMicrotask(() => {
          const profile = {
            userId: savedId,
            userName: savedName,
            color: savedColor,
          };
          setUserProfile(profile);
          emitJoinTable(profile);

          // Fast HTTP session sync on mount
          fetch("/api/table-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join",
              restaurantSlug,
              tableNumber,
              user: {
                id: profile.userId,
                name: profile.userName,
                color: profile.color,
                joinedAt: Date.now(),
              },
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data?.success && data.session) {
                setSession((prev) => ({
                  ...data.session,
                  cart: mergeServerCart(prev.cart, data.session.cart, profile.userId),
                }));
                if (data.session.diningSessionId) {
                  setJoinedDiningSessionId(data.session.diningSessionId);
                }
                if (data.session.status === "CLOSED" || data.session.billStatus === "PAID") {
                  setIsTableClosed(true);
                } else {
                  setIsTableClosed(false);
                }
              }
            })
            .catch(() => {});
        });
      } else {
        queueMicrotask(() => {
          setIsOnboardingOpen(true);
        });
        fetch(
          `/api/table-sync?restaurantSlug=${encodeURIComponent(restaurantSlug)}&tableNumber=${encodeURIComponent(tableNumber)}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && data.session) {
              setSession(data.session);
              if (data.session.diningSessionId) {
                setJoinedDiningSessionId(data.session.diningSessionId);
              }
              if (data.session.status === "CLOSED" || data.session.billStatus === "PAID") {
                setIsTableClosed(true);
              } else {
                setIsTableClosed(false);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [emitJoinTable, restaurantSlug, tableNumber]);

  // 4b. Lock background scroll and auto-scroll to top while onboarding modal is open
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isOnboardingOpen) {
        window.scrollTo(0, 0);
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [isOnboardingOpen]);

  // 4c. 1.5s Polling fallback for Cloudflare Tunnel / single-port HTTP resilience
  useEffect(() => {
    let isMounted = true;

    async function pollTableState() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      try {
        const res = await fetch(
          `/api/table-sync?restaurantSlug=${encodeURIComponent(restaurantSlug)}&tableNumber=${encodeURIComponent(tableNumber)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data.session && isMounted) {
          // If server diningSessionId changed, update local reference without closing table
          if (
            data.session.diningSessionId &&
            data.session.diningSessionId !== joinedDiningSessionIdRef.current
          ) {
            setJoinedDiningSessionId(data.session.diningSessionId);
          }

          // STRICT RESTRICTION: ONLY show table closed screen if explicitly CLOSED or billStatus === PAID
          const isExplicitlyClosed =
            data.session.status === "CLOSED" ||
            data.session.billStatus === "PAID";

          if (isExplicitlyClosed) {
            setIsTableClosed(true);
            setIsReviewModalOpen(false);
          } else {
            setIsTableClosed(false);
          }

          // Sync "Order Placed" celebration screen to every phone at the table
          const submittedRoundNum = data.session.lastSubmittedRound;
          const isNewlySubmittedRound =
            submittedRoundNum !== undefined &&
            submittedRoundNum > 0 &&
            !celebratedRoundsRef.current.has(submittedRoundNum);

          if (data.session.orderPlaced || isNewlySubmittedRound) {
            const roundToCelebrate = submittedRoundNum || (data.session.roundNumber - 1);
            if (roundToCelebrate > 0 && !celebratedRoundsRef.current.has(roundToCelebrate)) {
              celebratedRoundsRef.current.add(roundToCelebrate);
              const roundObj =
                data.session.submittedRounds?.find((r: { roundNumber: number }) => r.roundNumber === roundToCelebrate) ||
                data.session.submittedRounds?.[data.session.submittedRounds.length - 1];

              setLastPlacedOrder({
                orderId: roundObj?.orderId || `ord_r${roundToCelebrate}`,
                roundNumber: roundToCelebrate,
                totalInCents: roundObj?.roundTotalInCents || 0,
              });
              setIsReviewModalOpen(true);
              showToast(`Order Placed for Round #${roundToCelebrate}! Sent to Kitchen.`, "success");
            }
          }

          setSession((prev) => {
            const isNewer = data.session.updatedAt > prev.updatedAt;
            const cartChanged = data.session.cart.length !== prev.cart.length;
            const usersChanged = data.session.users.length !== prev.users.length;
            const statusChanged = data.session.status !== prev.status;
            const roundChanged = data.session.roundNumber !== prev.roundNumber;

            if (isNewer || cartChanged || usersChanged || statusChanged || roundChanged) {
              // Trigger item addition animation if items increased
              if (data.session.cart.length > prev.cart.length) {
                const added = data.session.cart[data.session.cart.length - 1];
                if (added && added.addedByUserId !== userProfileRef.current?.userId) {
                  triggerItemAddedAnimation(
                    added.addedByUserId,
                    added.addedByUserName || "Guest",
                    added.name
                  );
                }
              }

              // If session moved to REVIEWING and we haven't opened modal yet
              if (data.session.status === "REVIEWING" && prev.status !== "REVIEWING") {
                setIsReviewModalOpen(true);
              }

              // If next round started and cart was emptied
              if (data.session.roundNumber > prev.roundNumber) {
                const roundToCelebrate = prev.roundNumber;
                if (!celebratedRoundsRef.current.has(roundToCelebrate)) {
                  celebratedRoundsRef.current.add(roundToCelebrate);
                  const roundObj =
                    data.session.submittedRounds?.find((r: { roundNumber: number }) => r.roundNumber === roundToCelebrate) ||
                    data.session.submittedRounds?.[data.session.submittedRounds.length - 1];

                  setLastPlacedOrder({
                    orderId: roundObj?.orderId || `ord_r${roundToCelebrate}`,
                    roundNumber: roundToCelebrate,
                    totalInCents: roundObj?.roundTotalInCents || 0,
                  });
                  setIsReviewModalOpen(true);
                  showToast(`Order Placed for Round #${roundToCelebrate}! Sent to Kitchen.`, "success");
                }
              }

              return {
                ...data.session,
                cart: mergeServerCart(prev.cart, data.session.cart, userProfileRef.current?.userId),
              };
            }
            return prev;
          });
        }
      } catch {
        // Quietly ignore background poll errors
      }
    }

    pollTableState();
    const pollInterval = setInterval(pollTableState, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [restaurantSlug, tableNumber, showToast, triggerItemAddedAnimation]);

  // 5. Setup Socket.IO connection and event listeners
  useEffect(() => {
    const socket = getSocketClient();

    function onConnect() {
      setIsSocketConnected(true);
      fetchAuthoritativeRedisState();
    }

    function onDisconnect() {
      setIsSocketConnected(false);
    }

    function onConnectError() {
      setIsSocketConnected(false);
    }

    function onUserJoined(data: { user: { name: string }; session: TableSession }) {
      if (data.session) setSession(data.session);
      showToast(`${data.user.name} joined the table!`, "info");
    }

    function onUserLeft(data: { userName: string; session: TableSession }) {
      if (data.session) setSession(data.session);
      showToast(`${data.userName} left the table`, "info");
    }

    function onCartUpdated(data: {
      cart: CartItem[];
      updatedBy: string;
      session: TableSession;
      addedItem?: CartItem;
    }) {
      if (data.session) {
        if (
          data.session.diningSessionId &&
          data.session.diningSessionId !== joinedDiningSessionIdRef.current
        ) {
          setJoinedDiningSessionId(data.session.diningSessionId);
        }

        setSession((prev) => {
          // If items were added to cart
          if (data.session.cart.length > prev.cart.length) {
            const added = data.addedItem || data.session.cart[data.session.cart.length - 1];
            if (added) {
              triggerItemAddedAnimation(
                added.addedByUserId,
                added.addedByUserName || data.updatedBy || "Guest",
                added.name
              );
            }
          }
          return {
            ...data.session,
            cart: mergeServerCart(prev.cart, data.session.cart, userProfileRef.current?.userId),
          };
        });
      }
    }

    function onErrorUnauthorized(data: { message: string }) {
      showToast(data.message, "error");
    }

    function onReviewModalOpen(data: { triggeredByName: string; session: TableSession }) {
      if (data.session) setSession(data.session);
      setIsReviewModalOpen(true);
      showToast(`${data.triggeredByName} requested order review!`, "info");
    }

    function onApprovalUpdated(data: { session: TableSession }) {
      if (data.session) setSession(data.session);
    }

    function onOrderSubmittedSuccess(data: {
      orderId: string;
      roundNumber: number;
      session: TableSession;
      ticket?: { totalInCents: number };
    }) {
      if (data.session) setSession(data.session);
      celebratedRoundsRef.current.add(data.roundNumber);
      setLastPlacedOrder({
        orderId: data.orderId,
        roundNumber: data.roundNumber,
        totalInCents: data.ticket?.totalInCents || 0,
      });
      setIsReviewModalOpen(true); // Open consensus celebration view
      showToast(`Order Placed for Round #${data.roundNumber}! Sent to Kitchen.`, "success");
    }

    function onTableStateSync(data: { session: TableSession }) {
      if (data.session) {
        if (
          data.session.diningSessionId &&
          data.session.diningSessionId !== joinedDiningSessionIdRef.current
        ) {
          setJoinedDiningSessionId(data.session.diningSessionId);
        }

        if (
          data.session.status === "CLOSED" ||
          data.session.billStatus === "PAID"
        ) {
          setIsTableClosed(true);
          setIsReviewModalOpen(false);
        } else {
          setIsTableClosed(false);
        }

        setSession((prev) => ({
          ...data.session,
          cart: mergeServerCart(prev.cart, data.session.cart, userProfileRef.current?.userId),
        }));
      }
    }

    function onTableSessionClosed(data: { message?: string }) {
      setIsTableClosed(true);
      setIsReviewModalOpen(false);
      showToast(data.message || "Thank you for dining with us! Your table bill has been closed.", "info");
    }

    function onBillRequested(data: { session: TableSession }) {
      if (data.session) setSession(data.session);
      showToast("Final bill requested! The cashier counter has been notified.", "info");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("USER_JOINED", onUserJoined);
    socket.on("USER_LEFT", onUserLeft);
    socket.on("CART_UPDATED", onCartUpdated);
    socket.on("ERROR_UNAUTHORIZED", onErrorUnauthorized);
    socket.on("REVIEW_MODAL_OPEN", onReviewModalOpen);
    socket.on("APPROVAL_UPDATED", onApprovalUpdated);
    socket.on("ORDER_SUBMITTED_SUCCESS", onOrderSubmittedSuccess);
    socket.on("TABLE_STATE_SYNC", onTableStateSync);
    socket.on("TABLE_SESSION_CLOSED", onTableSessionClosed);
    socket.on("BILL_REQUESTED", onBillRequested);

    if (socket.connected) {
      queueMicrotask(() => setIsSocketConnected(true));
      fetchAuthoritativeRedisState();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("USER_JOINED", onUserJoined);
      socket.off("USER_LEFT", onUserLeft);
      socket.off("CART_UPDATED", onCartUpdated);
      socket.off("ERROR_UNAUTHORIZED", onErrorUnauthorized);
      socket.off("REVIEW_MODAL_OPEN", onReviewModalOpen);
      socket.off("APPROVAL_UPDATED", onApprovalUpdated);
      socket.off("ORDER_SUBMITTED_SUCCESS", onOrderSubmittedSuccess);
      socket.off("TABLE_STATE_SYNC", onTableStateSync);
      socket.off("TABLE_SESSION_CLOSED", onTableSessionClosed);
      socket.off("BILL_REQUESTED", onBillRequested);
    };
  }, [fetchAuthoritativeRedisState, showToast, triggerItemAddedAnimation]);

  const handleStartNewTableSession = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("platesync_user_name");
      localStorage.removeItem("tablesync_user_name");
      localStorage.removeItem("platesync_user_id");
      localStorage.removeItem("tablesync_user_id");
      localStorage.removeItem("platesync_user_color");
      localStorage.removeItem("tablesync_user_color");
    }
    celebratedRoundsRef.current.clear();
    setUserProfile(null);
    setIsTableClosed(false);
    setJoinedDiningSessionId(null);
    joinedDiningSessionIdRef.current = null;
    setIsReviewModalOpen(false);
    setLastPlacedOrder(null);
    setIsOnboardingOpen(true);
  }, []);

  const handleOnboardingComplete = (profile: UserProfile, isNewCustomerGroup: boolean) => {
    // 0ms Instant Optimistic UI: display user and avatar island immediately
    setUserProfile(profile);
    setIsOnboardingOpen(false);

    if (isNewCustomerGroup) {
      celebratedRoundsRef.current.clear();
      setIsTableClosed(false);
      setJoinedDiningSessionId(null);
      joinedDiningSessionIdRef.current = null;
      setIsReviewModalOpen(false);
      setLastPlacedOrder(null);

      // Create an optimistic fresh Round 1 session
      setSession({
        diningSessionId: `sess_${tableNumber}_${Date.now().toString(36)}`,
        restaurantSlug,
        tableNumber,
        users: [
          {
            id: profile.userId,
            name: profile.userName,
            color: profile.color,
            joinedAt: Date.now(),
          },
        ],
        cart: [],
        approvals: [],
        consensusVotes: {},
        roundNumber: 1,
        status: "IDLE",
        submittedRounds: [],
        tableGrandTotalInRupees: 0,
        tableGrandTotalInCents: 0,
        orderPlaced: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      showToast(`Welcome, ${profile.userName}! Started fresh order for Table #${tableNumber}.`, "success");

      // Background network synchronization for fresh customer group
      const socket = getSocketClient();
      if (socket.connected) {
        socket.emit(
          "START_NEW_CUSTOMER_GROUP",
          {
            restaurantSlug,
            tableNumber,
            user: {
              id: profile.userId,
              name: profile.userName,
              color: profile.color,
            },
          },
          (res: { success?: boolean; session?: TableSession }) => {
            if (res?.success && res.session) {
              setSession(res.session);
              if (res.session.diningSessionId) {
                setJoinedDiningSessionId(res.session.diningSessionId);
              }
            }
          }
        );
      }

      fetch("/api/table-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "startNewCustomerGroup",
          restaurantSlug,
          tableNumber,
          user: {
            id: profile.userId,
            name: profile.userName,
            color: profile.color,
            joinedAt: Date.now(),
          },
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data.session) {
            setSession(data.session);
            if (data.session.diningSessionId) {
              setJoinedDiningSessionId(data.session.diningSessionId);
            }
          }
        })
        .catch((err) => {
          console.warn("[HTTP Sync] Error starting new customer group:", err);
        });

      return;
    }

    if (session.diningSessionId) {
      setJoinedDiningSessionId(session.diningSessionId);
    }
    setSession((prev) => {
      const userExists = prev.users.some((u) => u.id === profile.userId);
      if (userExists) return prev;
      return {
        ...prev,
        users: [
          ...prev.users,
          {
            id: profile.userId,
            name: profile.userName,
            color: profile.color,
            joinedAt: Date.now(),
          },
        ],
        updatedAt: Date.now(),
      };
    });
    showToast(`Welcome, ${profile.userName}! You joined Table #${tableNumber}.`, "success");

    // Background network synchronization
    emitJoinTable(profile);
    fetch("/api/table-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "join",
        restaurantSlug,
        tableNumber,
        user: {
          id: profile.userId,
          name: profile.userName,
          color: profile.color,
          joinedAt: Date.now(),
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.session) {
          setSession(data.session);
          if (data.session.diningSessionId) {
            setJoinedDiningSessionId(data.session.diningSessionId);
          }
        }
      })
      .catch((err) => {
        console.warn("[HTTP Sync] Error on join:", err);
      });
  };

  // Request Final Bill (Cashier settlement)
  const handleRequestFinalBill = useCallback(() => {
    if (isDisconnected) {
      showToast("Cannot request bill while offline. Reconnecting...", "error");
      return;
    }

    if (!userProfile) return;

    // 0ms Optimistic UI update
    setSession((prev) => ({
      ...prev,
      status: "AWAITING_PAYMENT",
      updatedAt: Date.now(),
    }));

    showToast("Bill requested! The cashier counter has your consolidated bill.", "info");

    const socket = getSocketClient();
    if (socket.connected) {
      socket.emit(
        "REQUEST_FINAL_BILL",
        {
          restaurantSlug,
          tableNumber,
          userId: userProfile.userId,
        },
        (res: { success?: boolean; session?: TableSession }) => {
          if (res?.success && res.session) {
            setSession(res.session);
          }
        }
      );
    }

    fetch("/api/table-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "requestFinalBill",
        restaurantSlug,
        tableNumber,
        userId: userProfile.userId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.session) {
          setSession(data.session);
        }
      })
      .catch((err) => {
        console.warn("[HTTP Sync] Error requesting final bill:", err);
      });
  }, [isDisconnected, userProfile, restaurantSlug, tableNumber, showToast]);

  // Safe Add to Cart (True 0ms Optimistic UI)
  const handleAddToCart = (item: {
    menuItemId: string;
    name: string;
    priceInRupees?: number;
    priceInCents: number;
    quantity: number;
    selectedModifiers: Array<{
      modifierId: string;
      label: string;
      priceInRupees?: number;
      priceInCents: number;
    }>;
    notes?: string;
  }) => {
    if (isDisconnected) {
      showToast("Cannot add item while offline. Reconnecting to table...", "error");
      return;
    }

    if (!userProfile) {
      setIsOnboardingOpen(true);
      return;
    }

    const cartItemId = `${userProfile.userId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticCartItem: CartItem = {
      id: cartItemId,
      menuItemId: item.menuItemId,
      name: item.name,
      priceInRupees: item.priceInRupees ?? item.priceInCents,
      priceInCents: item.priceInCents,
      quantity: item.quantity,
      addedByUserId: userProfile.userId,
      addedByUserName: userProfile.userName,
      selectedModifiers: item.selectedModifiers,
      notes: item.notes,
      createdAt: Date.now(),
    };

    // 0ms Instant local update on screen
    setSession((prev) => ({
      ...prev,
      cart: [...prev.cart, optimisticCartItem],
      consensusVotes: {}, // Invalidate votes on cart mutation
      updatedAt: Date.now(),
    }));

    triggerItemAddedAnimation(userProfile.userId, userProfile.userName, item.name);

    // 1. Socket.IO dispatch (background)
    const socket = getSocketClient();
    if (socket.connected) {
      socket.emit(
        "ADD_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          cartItemId: optimisticCartItem.id,
          id: optimisticCartItem.id,
          menuItemId: item.menuItemId,
          name: item.name,
          priceInRupees: item.priceInRupees ?? item.priceInCents,
          priceInCents: item.priceInCents,
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers,
          notes: item.notes,
          userId: userProfile.userId,
          userName: userProfile.userName,
        },
        (res: { success?: boolean; session?: TableSession }) => {
          if (res?.success && res.session) {
            if (res.session.diningSessionId && res.session.diningSessionId !== joinedDiningSessionIdRef.current) {
              setJoinedDiningSessionId(res.session.diningSessionId);
            }
            setSession((prev) => ({
              ...res.session!,
              cart: mergeServerCart(prev.cart, res.session!.cart, userProfile.userId),
            }));
          }
        }
      );
    }

    // 2. Dual dispatch via HTTP fallback (/api/table-sync)
    fetch("/api/table-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addItem",
        restaurantSlug,
        tableNumber,
        item: optimisticCartItem,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.session) {
          if (data.session.diningSessionId && data.session.diningSessionId !== joinedDiningSessionIdRef.current) {
            setJoinedDiningSessionId(data.session.diningSessionId);
          }
          setSession((prev) => ({
            ...data.session,
            cart: mergeServerCart(prev.cart, data.session.cart, userProfile.userId),
          }));
        }
      })
      .catch((err) => {
        console.warn("[HTTP Sync] Add item error:", err);
      });
  };

  // Safe Remove Cart Item (True 0ms Optimistic UI)
  const handleRemoveCartItem = (cartItemId: string) => {
    if (isDisconnected) {
      showToast("Cannot remove item while offline. Reconnecting...", "error");
      return;
    }

    if (!userProfile) return;

    // 0ms Instant local removal
    setSession((prev) => ({
      ...prev,
      cart: prev.cart.filter((i) => i.id !== cartItemId),
      consensusVotes: {},
      updatedAt: Date.now(),
    }));

    // 1. Socket.IO dispatch (background)
    const socket = getSocketClient();
    if (socket.connected) {
      socket.emit(
        "REMOVE_CART_ITEM",
        {
          restaurantSlug,
          tableNumber,
          cartItemId,
          userId: userProfile.userId,
        },
        (res: { success?: boolean; session?: TableSession; error?: string; message?: string }) => {
          if (res?.success && res.session) {
            if (res.session.diningSessionId && res.session.diningSessionId !== joinedDiningSessionIdRef.current) {
              setJoinedDiningSessionId(res.session.diningSessionId);
            }
            setSession(res.session);
          } else if (res?.error === "ERROR_UNAUTHORIZED") {
            showToast(res.message || "Cannot delete item added by another diner.", "error");
          }
        }
      );
    }

    // 2. Dual dispatch via HTTP fallback (/api/table-sync)
    fetch("/api/table-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "removeItem",
        restaurantSlug,
        tableNumber,
        cartItemId,
        userId: userProfile.userId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.session) {
          if (data.session.diningSessionId && data.session.diningSessionId !== joinedDiningSessionIdRef.current) {
            setJoinedDiningSessionId(data.session.diningSessionId);
          }
          setSession(data.session);
        } else if (data?.error) {
          showToast(data.error, "error");
        }
      })
      .catch((err) => {
        console.warn("[HTTP Sync] Remove item error:", err);
      });
  };

  // Trigger Review (True 0ms Optimistic UI)
  const handleTriggerReview = () => {
    if (isDisconnected) {
      showToast("Network offline. Please wait until connection is restored.", "error");
      return;
    }

    if (!userProfile) return;

    // 0ms Instant opening of review modal
    setIsReviewModalOpen(true);
    setSession((prev) => ({
      ...prev,
      status: "REVIEWING",
      updatedAt: Date.now(),
    }));

    // 1. Socket.IO dispatch
    const socket = getSocketClient();
    if (socket.connected) {
      socket.emit(
        "TRIGGER_REVIEW",
        {
          restaurantSlug,
          tableNumber,
          userId: userProfile.userId,
        },
        (res: { success?: boolean; session?: TableSession }) => {
          if (res?.success && res.session) {
            setSession(res.session);
            setIsReviewModalOpen(true);
          }
        }
      );
    }

    // 2. Dual dispatch via HTTP fallback (/api/table-sync)
    fetch("/api/table-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "triggerReview",
        restaurantSlug,
        tableNumber,
        userId: userProfile.userId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.session) {
          setSession(data.session);
          setIsReviewModalOpen(true);
        }
      })
      .catch((err) => {
        console.warn("[HTTP Sync] Trigger review error:", err);
      });
  };

  // Submit Approval ("Looks Good!" - True 0ms Optimistic UI)
  const handleSubmitApproval = () => {
    if (isDisconnected) {
      showToast("Cannot submit vote while offline. Reconnecting...", "error");
      return;
    }

    if (!userProfile) return;

    // 0ms Instant optimistic vote on screen
    setSession((prev) => {
      const prevApprovals = prev.approvals || [];
      const newApprovals = prevApprovals.includes(userProfile.userId)
        ? prevApprovals
        : [...prevApprovals, userProfile.userId];
      return {
        ...prev,
        approvals: newApprovals,
        consensusVotes: {
          ...prev.consensusVotes,
          [userProfile.userId]: true,
        },
        updatedAt: Date.now(),
      };
    });

    // 1. Socket.IO dispatch (background)
    const socket = getSocketClient();
    if (socket.connected) {
      socket.emit(
        "SUBMIT_APPROVAL",
        {
          restaurantSlug,
          tableNumber,
          userId: userProfile.userId,
          hasApproved: true,
        },
        (res: { success?: boolean; session?: TableSession }) => {
          if (res?.success && res.session) {
            setSession(res.session);
          }
        }
      );
    }

    // 2. Dual dispatch via HTTP fallback (/api/table-sync)
    fetch("/api/table-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitApproval",
        restaurantSlug,
        tableNumber,
        userId: userProfile.userId,
        hasApproved: true,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          if (data.session) {
            setSession(data.session);
          }
          if (data.status === "ORDER_SUBMITTED") {
            celebratedRoundsRef.current.add(data.roundNumber);
            setLastPlacedOrder({
              orderId: data.orderId,
              roundNumber: data.roundNumber,
              totalInCents: data.ticket?.totalInCents || 0,
            });
            setIsReviewModalOpen(true);
            showToast(`Order Placed for Round #${data.roundNumber}! Sent to Kitchen.`, "success");
          }
        }
      })
      .catch((err) => {
        console.warn("[HTTP Sync] Submit approval error:", err);
      });
  };

  // Force reconnect helper
  const handleForceReconnect = () => {
    const socket = getSocketClient();
    socket.connect();
    fetch(
      `/api/table-sync?restaurantSlug=${encodeURIComponent(restaurantSlug)}&tableNumber=${encodeURIComponent(tableNumber)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.session) {
          setSession(data.session);
        }
      })
      .catch(() => {});
  };

  // Dismiss celebration and proceed to next round
  const handleDismissCelebration = () => {
    setLastPlacedOrder(null);
    setIsReviewModalOpen(false);
  };

  return (
    <div
      className={`min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col items-center pt-10 ${
        isOnboardingOpen ? "h-[100dvh] overflow-hidden" : ""
      }`}
    >
      {/* 1. Signature Element 1: The "Live Table Pill" (Dynamic Presence Island) */}
      <LiveTablePill
        tableNumber={tableNumber}
        roundNumber={session.roundNumber}
        users={session.users}
        currentUserId={userProfile?.userId}
        isDisconnected={isDisconnected}
        pulsingUserId={pulsingUserId}
        onPillClick={() => {}}
      />

      {/* 2. Network Resilience Safeguard Overlay ("Bad WiFi" blur + banner) */}
      <NetworkResilienceOverlay
        isDisconnected={isDisconnected}
        tableNumber={tableNumber}
        onForceReconnect={handleForceReconnect}
      />

      {/* 3. Lightweight Item Addition Toast Pill (Sliding into bottom cart bar) */}
      <div className="fixed bottom-22 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
        <AnimatePresence>
          {liveItemToast && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto backdrop-blur-md bg-white/95 border border-[#E7E5E4] rounded-full px-4 py-2 shadow-lg shadow-stone-900/5 flex items-center gap-2 text-xs font-medium text-[#1C1917]"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: liveItemToast.userColor }}
              />
              <span className="font-semibold">{liveItemToast.userName}</span>
              <span className="text-stone-500">added</span>
              <span className="font-semibold text-stone-900 truncate max-w-[140px]">
                {liveItemToast.itemName}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Global Toast Notification Container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-14 z-40 px-4 py-2 rounded-full shadow-md text-xs font-semibold flex items-center gap-2 border ${
              toastMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-white text-stone-800 border-stone-200"
            }`}
          >
            {toastMessage.type === "error" && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
            {toastMessage.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            {toastMessage.type === "info" && <Sparkles className="w-3.5 h-3.5 text-stone-600" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Main Container */}
      <div className="w-full max-w-lg px-4 pt-3 flex flex-col flex-1">
        {/* Clean Restaurant Header */}
        <header className="pb-3 border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="font-extrabold text-2xl text-[#1C1917] tracking-tight flex items-center gap-2">
              <span>{restaurantName}</span>
              <UtensilsCrossed className="w-5 h-5 text-stone-700" />
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Multiplayer Dining Menu
            </p>
          </div>

          {userProfile && (
            <div className="flex items-center gap-2">
              <div
                style={{
                  backgroundColor: getGuestSignatureColor(userProfile.userId).hex,
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
              >
                {userProfile.userName.substring(0, 1).toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-[#1C1917] leading-tight">
                  {userProfile.userName}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardingOpen(true)}
                  className="text-[10px] font-medium text-stone-500 hover:text-stone-900 hover:underline cursor-pointer"
                >
                  Edit Name
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Awaiting Payment Banner */}
        {session.status === "AWAITING_PAYMENT" && (
          <div className="mt-3 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-950">
                  Bill Requested • Awaiting Payment
                </h4>
                <p className="text-xs text-amber-800/90 font-medium">
                  The cashier counter has your consolidated bill (₹{(session.tableGrandTotalInRupees || session.tableGrandTotalInCents / 100).toLocaleString("en-IN")}). Please pay at the front counter.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 text-xs font-bold font-mono uppercase tracking-wider shrink-0 self-start sm:self-center">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              At Counter
            </span>
          </div>
        )}

        {/* Done Eating • Request Final Bill CTA (Available after Round 1 is placed and not yet requested) */}
        {session.status !== "AWAITING_PAYMENT" &&
          ((session.submittedRounds && session.submittedRounds.length > 0) || session.roundNumber > 1) && (
            <div className="mt-3 p-3.5 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Receipt className="w-4 h-4 text-stone-600 shrink-0" />
                <div className="text-xs text-stone-700 truncate">
                  <span className="font-semibold text-stone-900">Finished dining?</span> Running total:{" "}
                  <span className="font-bold font-mono text-stone-900">
                    ₹{(session.tableGrandTotalInRupees || session.tableGrandTotalInCents / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestFinalBill}
                className="shrink-0 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Done Eating • Request Final Bill</span>
              </button>
            </div>
          )}

        {/* Round 2+ Announcement Banner */}
        {session.roundNumber > 1 && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-amber-950">
                <strong>Round #{session.roundNumber} is active!</strong> Add more drinks, sides, or food anytime.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-200">
              Open
            </span>
          </div>
        )}

        {/* Menu Browsing View */}
        <MenuBrowser
          menuItems={initialMenuItems}
          categories={categories}
          onSelectItem={(item) => setActiveItemForCustomization(item)}
        />
      </div>

      {/* Floating Collaborative Live Cart Bar */}
      <LiveCartBar
        cart={session.cart}
        users={session.users}
        currentUserId={userProfile?.userId || ""}
        tableNumber={tableNumber}
        roundNumber={session.roundNumber}
        onRemoveItem={handleRemoveCartItem}
        onTriggerReview={handleTriggerReview}
      />

      {/* Item Customizer Drawer */}
      <ItemCustomizerDrawer
        item={activeItemForCustomization}
        isOpen={!!activeItemForCustomization}
        onClose={() => setActiveItemForCustomization(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Onboarding Name Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        existingDiners={session.users.map((u) => u.name)}
        activeRoundsCount={(session.submittedRounds?.length || 0) + (session.roundNumber > 1 ? 1 : 0)}
        onComplete={handleOnboardingComplete}
      />

      {/* Consensus Modal with Consensus Ring and Kitchen Stamp */}
      <ConsensusModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        session={session}
        currentUserId={userProfile?.userId || ""}
        restaurantName={restaurantName}
        onSubmitApproval={handleSubmitApproval}
        lastPlacedOrder={lastPlacedOrder}
        onDismissCelebration={handleDismissCelebration}
      />

      {/* Polite Table Session Closed Thank You Screen */}
      <AnimatePresence>
        {isTableClosed && (
          <div className="fixed inset-0 z-[120] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0">
                <ReceiptEdge fillColor="#F5F5F4" edgeHeight={7} position="top" />
              </div>

              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm mt-1">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider font-mono">
                  Table {tableNumber} • {restaurantName}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  Thank you for dining with us!
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Your table bill has been closed and settled by the cashier. We hope you enjoyed your meal!
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartNewTableSession}
                  className="w-full bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold text-sm tracking-wide py-3.5 px-6 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Start New Table Session</span>
                </button>
              </div>

              <div className="absolute bottom-0 inset-x-0">
                <ReceiptEdge fillColor="#F5F5F4" edgeHeight={7} position="bottom" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
