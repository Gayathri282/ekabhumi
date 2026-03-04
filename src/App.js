import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails.jsx";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import TrackOrder from "./pages/TrackOrder";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import RefundAndCancellation from "./pages/RefundAndCancellation";
import ShippingAndDelivery from "./pages/ShippingAndDelivery";

function App() {
  return (
    <Router>
      <Routes>
        {/* -------------------- PUBLIC -------------------- */}
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetails />} />

       <Route path="/track-order/:orderId" element={<TrackOrder />} />
<Route path="/track-order" element={<TrackOrder />} />

        {/* -------------------- POLICIES ------------------ */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/refund-and-cancellation" element={<RefundAndCancellation />} />
        <Route path="/shipping-and-delivery" element={<ShippingAndDelivery />} />

        {/* -------------------- ADMIN LOGIN ---------------- */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* -------------------- ADMIN PROTECTED ------------ */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;