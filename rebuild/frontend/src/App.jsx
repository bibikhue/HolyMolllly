import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

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
import OwnersVisit from "./pages/owners/Visit";
import OwnersSales from "./pages/owners/Sales";
import Visitors from "./pages/visitors";
import VisitorsStays from "./pages/visitors/Stays";
import VisitorsAttractions from "./pages/visitors/Attractions";
import VisitorsRecommendedCourses from "./pages/visitors/RecommendedCourses";
import { PATHS } from "./constants/paths";
import { getCurrentUser, logout } from "./apis/auth";

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(!isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    let active = true;
    getCurrentUser()
      .then(({ data }) => {
        if (active) setIsLoggedIn(data?.user?.role === "admin");
      })
      .catch(() => {
        if (active) setIsLoggedIn(false);
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
      if (!isCheckingLogin) setIsLoginOpen(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(PATHS.HOME, { replace: true });
    setIsLoggedIn(false);
    setIsLoginOpen(false);
  };

  return (
    <>
      <Header onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />
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
                onRequireLogin={setIsLoginOpen}
              />
            }
          >
            <Route path={PATHS.ADMIN} element={<Admin />} />
            <Route path={PATHS.ADMIN_COUNTRIES} element={<CountryStatistics />} />
            <Route path={PATHS.ADMIN_REPORT} element={<AdminReport />} />
            <Route path={PATHS.ADMIN_FORECAST} element={<AdminForecast />} />
          </Route>
          <Route path={PATHS.OWNERS} element={<Owners />} />
          <Route path={PATHS.OWNERS_VISIT} element={<OwnersVisit />} />
          <Route path={PATHS.OWNERS_SALES} element={<OwnersSales />} />
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
      <Chatbot />
      {isLoginOpen && (
        <Login
          onClose={() => setIsLoginOpen(false)}
          onLogin={() => {
            setIsLoggedIn(true);
            setIsLoginOpen(false);
          }}
        />
      )}
    </>
  );
}

export default App;
