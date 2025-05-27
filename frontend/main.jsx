import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { ToastContainer, toast } from "react-toastify";
import { customToastContainerStyle } from "./components/Toast";
import "react-toastify/dist/ReactToastify.css";

import "./index.css";
import BelowHero from "./BelowHero";
import Hero from "./Hero";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Approval from "./pages/approval";
import Gallery from "./pages/gallery";
import About from "./pages/about";
import Upload from "./pages/upload";
import { useEffect, useState } from "react";

// Protected Route Component for Admins
const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } catch (err) {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  if (isAdmin === null) return null; // or a loading spinner
  return isAdmin ? children : <Navigate to="/" replace />;
};

const AuthRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        setIsAuthenticated(Boolean(data.email));
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) return null; // or a loading indicator
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Main App Component
const App = () => {
  return (
    <Router>
      <div id="root">
        <Navbar />
        <div className="page-container">
          <div className="main-content">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <Hero />
                    <BelowHero />
                  </>
                }
              />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/about" element={<About />} />

              {/* Protected Upload Page for Logged-in Users */}
              <Route
                path="/upload"
                element={
                  <AuthRoute>
                    <Upload />
                  </AuthRoute>
                }
              />

              {/* Protected Approval Page for Admins */}
              <Route
                path="/approval"
                element={
                  <AdminRoute>
                    <Approval />
                  </AdminRoute>
                }
              />
            </Routes>
          </div>
          <Footer />
        </div>
        <ToastContainer theme="dark" toastStyle={customToastContainerStyle} />
      </div>
    </Router>
  );
};

// Render App
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
