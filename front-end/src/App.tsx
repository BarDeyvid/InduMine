import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import PublicHome from "@/pages/PublicHome"; // Add this import
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CategoryDetail from "@/pages/CategoryDetail";
import ProductDetail from "@/pages/ProductDetail";
import NotFound from "@/pages/NotFound";
import Categories from "@/pages/Categories";
import { ThemeProvider } from "./context/ThemeContext";
import Home from "./pages/Home";

const isAuthenticated = () => {
  return localStorage.getItem('auth_token') !== null;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster />
          <Routes>
            {/* Public homepage for non-logged users, dashboard for logged users */}
            <Route 
              path="/" 
            element={
              <Home />
            } 
          />
          
          {/* Protected dashboard route */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated() ? <Index /> : <Navigate to="/login" />
            } 
          />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/categories/:slug" 
            element={
              isAuthenticated() ? <CategoryDetail /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/categories"
            element={
              isAuthenticated() ? <Categories /> : <Navigate to="/login" />
            }
            />
          <Route 
            path="/products/:id" 
            element={
              isAuthenticated() ? <ProductDetail /> : <Navigate to="/login" />
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;