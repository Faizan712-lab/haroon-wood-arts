import {
  createContext,
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  getApiUrl
} from "../utils/api";

import {
  getActiveUserSession
} from "../utils/auth";

export const WishlistContext =
  createContext();

export function WishlistProvider({ children }) {
  const navigate =
    useNavigate();

  const [items, setItems] =
    useState([]);

  async function loadWishlist() {
    const session =
      await getActiveUserSession();

    if (!session) {
      setItems([]);
      return;
    }

    try {
      const response = await fetch(
        getApiUrl("/api/wishlist"),
        {
          credentials: "include",
          cache: "no-store"
        }
      );

      const data =
        await response.json();

      if (response.ok && data.success) {
        setItems(data.items || []);
      }
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    loadWishlist();

    window.addEventListener(
      "userAuthChanged",
      loadWishlist
    );

    return () =>
      window.removeEventListener(
        "userAuthChanged",
        loadWishlist
      );
  }, []);

  function isWishlisted(productId) {
    return items.some(item =>
      String(item.productId || item.id) ===
      String(productId)
    );
  }

  async function toggleWishlist(product) {
    const session =
      await getActiveUserSession();

    if (!session) {
      navigate(
        `/login?next=${encodeURIComponent("/wishlist")}`
      );
      return;
    }

    const saved =
      isWishlisted(product.id);

    const response = await fetch(
      getApiUrl(`/api/wishlist/${product.id}`),
      {
        method: saved ? "DELETE" : "POST",
        credentials: "include"
      }
    );

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      toast.error(data.message || "Wishlist update failed");
      return;
    }

    if (saved) {
      setItems(previous =>
        previous.filter(item =>
          String(item.productId || item.id) !==
          String(product.id)
        )
      );
      toast.success("Removed from wishlist");
    } else {
      setItems(previous => [
        {
          ...product,
          productId: product.id
        },
        ...previous
      ]);
      toast.success("Added to wishlist");
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        isWishlisted,
        toggleWishlist,
        reloadWishlist: loadWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
