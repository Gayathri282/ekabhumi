import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Home stays eager — it's the landing page, must render immediately
import Home from "./pages/Home";

// Everything else is lazy — only downloaded when the user navigates there
const ProductDetails  = lazy(() => import("./pages/ProductDetails"));
const Account         = lazy(() => import("./pages/Account"));
const AdminLogin      = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard"));
const ProtectedRoute  = lazy(() => import("./components/ProtectedRoute"));

const PageLoader = () => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "60vh", fontSize: 15, color: "#888"
  }}>
    Loading…
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* PUBLIC */}
          <Route path="/"             element={<Home />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/account"      element={<Account />} />

          {/* ADMIN */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;