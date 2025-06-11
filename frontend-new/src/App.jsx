import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { customToastContainerStyle } from "./components/Toast";
import "react-toastify/dist/ReactToastify.css";

import "../index.css";
import BelowHero from "./components/BelowHero";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Approval from "./pages/approval";
import Gallery from "./pages/gallery";
import About from "./pages/about";
import Upload from "./pages/upload";

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

// Protected Route Component for Authenticated Users
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

  if (isAuthenticated === null) return null; // or a loading spinner
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Main App Component
const App = () => (
    <Router>
      <Navbar />
      <div className="page-container">
        <div className="main-content">
          <Routes>
            <Route path="/" element={
                <><Hero />
                <BelowHero /></>} 
            />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about" element={<About />} />
            <Route path="/upload" element={
                <AuthRoute>
                <Upload />
                </AuthRoute>} 
            />
            <Route path="/approval" element={
                <AdminRoute>
                <Approval />
                </AdminRoute>} 
            />
          </Routes>
        </div>
        <Footer />
      </div>
      <ToastContainer theme="dark" toastStyle={customToastContainerStyle} />
    </Router>
  );
  

export default App;
