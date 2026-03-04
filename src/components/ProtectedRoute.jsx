//componnents/protectedroute.jsx
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  if (!requireAdmin) return children;

  const token = localStorage.getItem("accessToken");
  const raw = localStorage.getItem("userData");

  let user = null;
  try {
    user = raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem("userData");
  }

  const isAdminUser = user?.role === "admin";

  if (!token || !isAdminUser) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userData");
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;