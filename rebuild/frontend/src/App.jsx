import { useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import "./App.css";

import Home from "./pages/Home";
import FAQ from "./pages/info/FAQ";
import About from "./pages/info/About";
import AnalysisScope from "./pages/info/AnalysisScope";
import DataSources from "./pages/info/DataSources";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Chatbot from "./components/Chatbot";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Admin from "./pages/admin";
import CountryStatistics from "./pages/admin/CountryStatistics";
import AdminReport from "./pages/admin/Report";
import AdminForecast from "./pages/admin/Forecast";
import Owners from "./pages/owners";
import OwnersStatistics from "./pages/owners/Statistics";
import WeeklyEvents from "./pages/owners/WeeklyEvents";
import Visitors from "./pages/visitors";
import VisitorsStays from "./pages/visitors/Stays";
import VisitorsAttractions from "./pages/visitors/Attractions";
import VisitorsRecommendedCourses from "./pages/visitors/RecommendedCourses";
import { PATHS } from "./constants/paths";
import { getCurrentUser, logout } from "./apis/auth";
import useGraphContext from "./components/useGraphContext";
import { AnalysisFiltersContext, initialAnalysisFilters } from "./components/analysisFilters";

function App() {
  const [filters, setFilters] = useState(initialAnalysisFilters);
  const filterContext = useMemo(() => ({ filters, setFilters }), [filters]);
  const [graphContext, refreshGraphContext] = useGraphContext();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [loginPurpose, setLoginPurpose] = useState("admin");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(!isLoggedIn);
  const openAdminLogin = useCallback((open) => { setLoginPurpose("admin"); setIsLoginOpen(open); }, []);

  useEffect(() => {
    if (isLoggedIn) return;
    let active = true;
    getCurrentUser()
      .then(({ data }) => {
        if (active) { setIsLoggedIn(data?.user?.role === "admin"); setAuthenticatedUser(data?.user ?? null); }
      })
      .catch(() => {
        if (active) { setIsLoggedIn(false); setAuthenticatedUser(null); }
      })
      .finally(() => {
        if (active) setIsCheckingLogin(false);
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const handleNavigate = (event, path) => {
    if (!isLoggedIn && path.startsWith(PATHS.ADMIN)) {
      event.preventDefault();
      if (!isCheckingLogin) openAdminLogin(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(PATHS.HOME, { replace: true });
    setIsLoggedIn(false);
    setAuthenticatedUser(null);
    setIsLoginOpen(false);
  };

  return (
    <AnalysisFiltersContext value={filterContext}>
      <Header onNavigate={handleNavigate} isLoggedIn={Boolean(authenticatedUser)} onLogout={handleLogout} />
      <main>
        <Routes>
          <Route path={PATHS.HOME} element={<Home />} />
          <Route path={PATHS.FAQ} element={<FAQ />} />
          <Route path={PATHS.ABOUT} element={<About />} />
          <Route path={PATHS.ANALYSIS_SCOPE} element={<AnalysisScope />} />
          <Route path={PATHS.DATA_SOURCES} element={<DataSources />} />
          <Route
            element={
              <ProtectedRoute
                isLoggedIn={isLoggedIn}
                isCheckingLogin={isCheckingLogin}
                onRequireLogin={openAdminLogin}
              />
            }
          >
            <Route path={PATHS.ADMIN} element={<Admin />} />
            <Route path={PATHS.ADMIN_COUNTRIES} element={<CountryStatistics />} />
            <Route path={PATHS.ADMIN_REPORT} element={<AdminReport />} />
            <Route path={PATHS.ADMIN_FORECAST} element={<AdminForecast />} />
          </Route>
          <Route path={PATHS.OWNERS} element={<Owners />} />
          <Route path={PATHS.OWNERS_PATTERNS} element={<OwnersStatistics />} />
          <Route path={PATHS.OWNERS_VISIT} element={<Navigate to={PATHS.OWNERS_PATTERNS} replace />} />
          <Route path={PATHS.OWNERS_SALES} element={<Navigate to={`${PATHS.OWNERS_PATTERNS}?metric=sales`} replace />} />
          <Route path={PATHS.OWNERS_WEEKLY_EVENTS} element={<WeeklyEvents />} />
          <Route path={PATHS.VISITORS} element={<Visitors />} />
          <Route path={PATHS.VISITORS_STAYS} element={<VisitorsStays />} />
          <Route
            path={PATHS.VISITORS_ATTRACTIONS}
            element={<VisitorsAttractions />}
          />
          <Route
            path={PATHS.VISITORS_RECOMMENDED_COURSES}
            element={<VisitorsRecommendedCourses />}
          />
        </Routes>
      </main>
      <Footer />
      <Chatbot graphContext={graphContext} refreshGraphContext={refreshGraphContext} isAuthenticated={Boolean(authenticatedUser)} onRequireLogin={() => { setLoginPurpose("planning"); setIsLoginOpen(true); }} />
      {isLoginOpen && (
        <Login
          requireAdmin={loginPurpose === "admin"}
          onClose={() => setIsLoginOpen(false)}
          onLogin={(user) => {
            setIsLoggedIn(user?.role === "admin");
            setAuthenticatedUser(user);
            setIsLoginOpen(false);
          }}
        />
      )}
    </AnalysisFiltersContext>
  );
}

export default App;
