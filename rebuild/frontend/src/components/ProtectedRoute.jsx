import { useEffect } from "react";
import { Outlet } from "react-router-dom";

function ProtectedRoute({ isLoggedIn, isCheckingLogin, onRequireLogin }) {
  useEffect(() => {
    if (!isCheckingLogin && !isLoggedIn) onRequireLogin(true);
  }, [isLoggedIn, isCheckingLogin, onRequireLogin]);

  return isLoggedIn ? <Outlet /> : null;
}

export default ProtectedRoute;
