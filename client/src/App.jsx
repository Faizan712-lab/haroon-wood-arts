import "./App.css";

import {
  Toaster
} from "react-hot-toast";

import {
  useEffect,
  useState
} from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

/* ================= USER COMPONENTS ================= */

import Navbar from "./components/Navbar";

import Hero from "./components/Hero";

import Products from "./components/Products";

/* ================= USER PAGES ================= */

import ProductDetails from "./pages/ProductDetails";

import Cart from "./pages/Cart";

import Checkout from "./pages/Checkout";

import Payment from "./pages/Payment";

import OrderSuccess from "./pages/OrderSuccess";

import Orders from "./pages/Orders";

import OrderDetails from "./pages/OrderDetails";

import Shop from "./pages/Shop";

import Categories from "./pages/Categories";

import About from "./pages/About";

import Contact from "./pages/Contact";

import UserAuth from "./pages/UserAuth";

import UserProfile from "./pages/UserProfile";
import UserSettings from "./pages/UserSettings";

import Wishlist from "./pages/Wishlist";

import {
  getActiveUserSession
} from "./utils/auth";

import {
  WishlistProvider
} from "./context/WishlistContext";

/* ================= ADMIN PAGES ================= */

import AdminLogin from "./pages/admin/AdminLogin";
import AdminSettings from "./pages/admin/AdminSettings";

import AdminLayout from "./pages/admin/AdminLayout";

import AdminDashboard from "./pages/admin/AdminDashboard";

import AdminOrders from "./pages/admin/AdminOrders";

import AdminProducts from "./pages/admin/AdminProducts";

import AdminAddProduct from "./pages/admin/AdminAddProduct";

import AdminCategories from "./pages/admin/AdminCategories";

/* ================= HOME ================= */

function Home() {

  return (

    <>
      <Hero />
      <Categories
        homeSection={true}
      />
      <Products />
    </>

  );

}

function ProtectedUserRoute({ children }) {

  const location =
    useLocation();

  const [session,
    setSession] =
    useState(null);

  const [checking,
    setChecking] =
    useState(true);

  useEffect(() => {

    let active = true;

    async function checkSession() {

      const currentSession =
        await getActiveUserSession();

      if (active) {

        setSession(currentSession);
        setChecking(false);

      }

    }

    checkSession();

    return () => {
      active = false;
    };

  }, []);

  if (checking) {

    return null;

  }

  if (!session) {

    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(
          location.pathname + location.search
        )}`}
        replace
      />
    );

  }

  return children;

}

/* ================= APP ================= */

function App() {

  return (

    <Router>

      <WishlistProvider>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            borderRadius: "8px",
            background: "#fffaf5",
            color: "#2f2118",
            border: "1px solid rgba(118, 80, 45, 0.14)",
            boxShadow: "0 14px 38px rgba(42, 27, 16, 0.18)"
          },
          success: {
            iconTheme: {
              primary: "#8a522b",
              secondary: "#fffaf5"
            }
          },
          error: {
            style: {
              background: "#fff5f3",
              color: "#7a2017",
              border: "1px solid rgba(192, 57, 43, 0.22)"
            },
            iconTheme: {
              primary: "#c0392b",
              secondary: "#fff5f3"
            }
          }
        }}
      />

      <Routes>

        {/* ================================================= */}
        {/* USER ROUTES */}
        {/* ================================================= */}

        <Route

          path="/"

          element={

            <>

              <Navbar />

              <Home />

            </>

          }

        />

        <Route path="/settings" element={<><Navbar /><ProtectedUserRoute><UserSettings /></ProtectedUserRoute></>} />

        <Route

          path="/login"

          element={

            <>

              <Navbar />

              <UserAuth />

            </>

          }

        />

        <Route

          path="/profile"

          element={

            <>

              <Navbar />

              <ProtectedUserRoute>

                <UserProfile />

              </ProtectedUserRoute>

            </>

          }

        />

        <Route

          path="/shop"

          element={

            <>

              <Navbar />

              <Shop />

            </>

          }

        />

        <Route

          path="/categories"

          element={

            <>

              <Navbar />

              <Categories />

            </>

          }

        />

        <Route

          path="/about"

          element={

            <>

              <Navbar />

              <About />

            </>

          }

        />

        <Route

          path="/contact"

          element={

            <>

              <Navbar />

              <Contact />

            </>

          }

        />

        <Route

          path="/product/:id"

          element={

            <>

              <Navbar />

              <ProductDetails />

            </>

          }

        />

        <Route

          path="/cart"

          element={

            <>

              <Navbar />

              <Cart />

            </>

          }

        />

        <Route

          path="/wishlist"

          element={

            <>

              <Navbar />

              <ProtectedUserRoute>

                <Wishlist />

              </ProtectedUserRoute>

            </>

          }

        />

        <Route

          path="/checkout"

          element={

            <>

              <Navbar />

              <ProtectedUserRoute>

                <Checkout />

              </ProtectedUserRoute>

            </>

          }

        />

        <Route

          path="/payment"

          element={

            <>

              <Navbar />

              <ProtectedUserRoute>

                <Payment />

              </ProtectedUserRoute>

            </>

          }

        />

        <Route

          path="/order-success"

          element={

            <>

              <Navbar />

              <OrderSuccess />

            </>

          }

        />

        <Route

          path="/orders"

          element={

            <>

              <Navbar />

              <ProtectedUserRoute>

                <Orders />

              </ProtectedUserRoute>

            </>

          }

        />

        <Route

          path="/order-details"

          element={

            <>

              <Navbar />

              <ProtectedUserRoute>

                <OrderDetails />

              </ProtectedUserRoute>

            </>

          }

        />

        {/* ================================================= */}
        {/* ADMIN LOGIN */}
        {/* ================================================= */}

        <Route

          path="/admin-login"

          element={<AdminLogin />}

        />

        <Route

          path="/admin/register"

          element={<AdminLogin />}

        />

        {/* ================================================= */}
        {/* ADMIN ROUTES */}
        {/* ================================================= */}

        <Route

          path="/admin"

          element={<AdminLayout />}

        >

          {/* DEFAULT ADMIN PAGE */}

          <Route

            index

            element={
              <Navigate
                to="dashboard"
                replace
              />
            }

          />

          {/* DASHBOARD */}

          <Route

            path="dashboard"

            element={<AdminDashboard />}

          />

          {/* ORDERS */}

          <Route

            path="orders"

            element={<AdminOrders />}

          />

          {/* PRODUCTS */}

          <Route

            path="products"

            element={<AdminProducts />}

          />

          {/* CATEGORIES */}

          <Route

            path="categories"

            element={<AdminCategories />}

          />

          {/* ADD PRODUCT */}

          <Route

            path="add-product"

            element={<AdminAddProduct />}

          />

          <Route

            path="settings"

            element={<AdminSettings />}

          />

        </Route>

        {/* ================================================= */}
        {/* INVALID ROUTE */}
        {/* ================================================= */}

        <Route

          path="*"

          element={
            <Navigate
              to="/"
              replace
            />
          }

        />

      </Routes>

      </WishlistProvider>

    </Router>

  );

}

export default App;
