// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './navbar/NavBar';
import Login from './auth/Login';
import Register from './auth/Register';
import Dashboard from './dashboard/Dashboard';
import ProtectedRoute from './ProtectedRoute';
import UnprotectedRoute from './UnprotectedRoute';   // <-- new file
import { useContext } from 'react';
import { AuthContext } from './auth/authContext';

export default function App() {
  const { isAuth } = useContext(AuthContext);

  /* ----------------------------------------------------------
     Decide whether to show the NavBar.
     We only want it on protected routes *and* when logged in.
   ---------------------------------------------------------- */
  const showNavBar = isAuth; // NavBar will be hidden on "/" and "/register"

  return (
    <Router>
      {showNavBar && <NavBar />}

      {/* Main content area */}
      <div className="main-content">
        <Routes>
          {/* Public routes – wrapped in UnprotectedRoute */}
          <Route
            path="/"
            element={
              <UnprotectedRoute>
                <Login />
              </UnprotectedRoute>
            }
          />

          <Route
            path="/register"
            element={
              <UnprotectedRoute>
                <Register />
              </UnprotectedRoute>
            }
          />

          {/* Protected route – Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Optional debugging NavBar exposure */}
          <Route path="/navbar" element={<NavBar />} />
          <Route path="/WEGMine" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
