import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails.jsx";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import Account from "./pages/Account";



function App() {
  return (
    <Router>
      <Routes>
        {/* -------------------- PUBLIC -------------------- */}
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/account" element={<Account />} />

       
       

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