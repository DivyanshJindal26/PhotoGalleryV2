// import { useState, useEffect } from "react";
// import { Link, NavLink } from "react-router-dom";
// import {getAuth,signInWithPopup, GoogleAuthProvider,signOut,} from "firebase/auth";
// import { initializeApp } from "firebase/app";
// import "./Navbar.css";

// // Firebase Config from .env
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
//   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const provider = new GoogleAuthProvider();
// provider.setCustomParameters({ hd: "students.iitmandi.ac.in" });

// const Navbar = () => {
//   const [user, setUser] = useState(null);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [error, setError] = useState(null);

//   const fetchUser = async () => {
//     try {
//       const res = await fetch("/api/auth/me", {
//         credentials: "include",
//       });
//       if (!res.ok) throw new Error();
//       const data = await res.json();
//       setUser(data);
//     } catch (err) {
//       setUser(null);
//     }
//   };

//   useEffect(() => {fetchUser()}, []);

//   useEffect(() => {
//     const handleResize = () => {
//       if (window.innerWidth > 768) setMenuOpen(false);
//     };
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const toggleMenu = () => setMenuOpen(!menuOpen);

//   const handleAuth = async () => {
//     try {
//       const result = await signInWithPopup(auth, provider);
//       const email = result.user.email;

//       if (!email.endsWith("@students.iitmandi.ac.in")) {
//         await signOut(auth);
//         setError("Only students.iitmandi.ac.in emails are allowed.");
//         return;
//       }

//       const idToken = await result.user.getIdToken(true);

//       const response = await fetch("/api/auth/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ idToken }),
//         credentials: "include",
//       });

//       if (!response.ok) {
//         setError("Login failed");
//         await signOut(auth);
//         return;
//       }

//       await fetchUser();
//       setError(null);
//     } catch (err) {
//       // console.error("Auth error:", err);
//       setError("Authentication error. Please try again.");
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       await fetch("/api/auth/logout", {
//         method: "POST",
//         credentials: "include",
//       });
//       setUser(null);
//     } catch (err) {
//       // console.error("Logout error:", err);
//       setError("Logout failed. Please try again.");
//     }
//   };

//   // ----------------------------------------------------

//   return (
//     <nav className="navbar">
//       <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
//         {/* <img src="/ico.png" alt="PhotoGallery Logo" className="logo-img" /> */}
//         <h2 className = 'logo'>PhotoGal</h2>
//       </Link>

//       <div className="hamburger-menu" onClick={toggleMenu}>
//         <div className={menuOpen ? "bar open" : "bar"}></div>
//         <div className={menuOpen ? "bar open" : "bar"}></div>
//         <div className={menuOpen ? "bar open" : "bar"}></div>
//       </div>

//       <ul className={`navbar-links ${menuOpen ? "active" : ""}`}>
//         <li>
//           <NavLink to="/" onClick={() => setMenuOpen(false)}
//             className={({ isActive }) => isActive ? "active" : ""}
//           >
//             Home
//           </NavLink>
//         </li>
//         <li>
//           <NavLink to="/gallery" onClick={() => setMenuOpen(false)}
//             className={({ isActive }) => isActive ? "active" : ""}
//           >
//             Gallery
//           </NavLink>
//         </li>
//         <li>
//           <NavLink to="/about" onClick={() => setMenuOpen(false)}
//             className={({ isActive }) => isActive ? "active" : ""}
//           >
//             About
//           </NavLink>
//         </li>
//         <li>
//           <NavLink to="/upload" onClick={() => setMenuOpen(false)}
//             className={({ isActive }) => isActive ? "active" : ""}
//           >
//             Upload
//           </NavLink>
//         </li>
//         {user?.isAdmin && (
//           <li>
//             <NavLink to="/approval" onClick={() => setMenuOpen(false)}
//               className={({ isActive }) => isActive ? "active" : ""}
//             >
//               Approval
//             </NavLink>
//           </li>
//         )}
//       </ul>


//       <div className="navbar-buttons">
//         {user ? (
//           <div className="user-profile">
//             <img
//               src={`https://images.weserv.nl/?url=${encodeURIComponent(
//                 user.picture
//               )}`}
//               alt="Profile"
//               className="user-pfp"
//               crossOrigin="anonymous"
//             />
//             <button className="logout-btn" onClick={handleLogout}>Logout</button>
//           </div>
//         ) : (
//           <button className="auth-btn" onClick={handleAuth}>Login</button>
//         )}
//       </div>

//       {error && <div className="error-message">{error}</div>}
//     </nav>
//   );
// };

// export default Navbar;


import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import "./Navbar.css";

// Firebase Config from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: "students.iitmandi.ac.in" });

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(null);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email.endsWith("@students.iitmandi.ac.in")) {
        await signOut(auth);
        setError("Only students.iitmandi.ac.in emails are allowed.");
        return;
      }

      const idToken = await result.user.getIdToken(true);

      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });

      if (!response.ok) {
        setError("Login failed");
        await signOut(auth);
        return;
      }

      await fetchUser();
      setError(null);
    } catch (err) {
      setError("Authentication error. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (err) {
      setError("Logout failed. Please try again.");
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
        <h2 className="logo">PhotoGal</h2>
      </Link>

      <div className="hamburger-menu" onClick={toggleMenu}>
        <div className={menuOpen ? "bar open" : "bar"}></div>
        <div className={menuOpen ? "bar open" : "bar"}></div>
        <div className={menuOpen ? "bar open" : "bar"}></div>
      </div>

      <ul className={`navbar-links ${menuOpen ? "active" : ""}`}>
        <li>
          <NavLink
            to="/"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/gallery"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Gallery
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/about"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            About
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/upload"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Upload
          </NavLink>
        </li>
        {user?.isAdmin && (
          <li>
            <NavLink
              to="/approval"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Approval
            </NavLink>
          </li>
        )}
      </ul>

      <div className="navbar-buttons">
        {user ? (
          <div className="user-profile">
            <img
              src={`https://images.weserv.nl/?url=${encodeURIComponent(
                user.picture
              )}`}
              alt="Profile"
              className="user-pfp"
              crossOrigin="anonymous"
            />
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="auth-btn" onClick={handleAuth}>
            Login
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
    </nav>
  );
};

export default Navbar;
