import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./context/ThemeContext";
import { NetworkProvider } from "./context/NetworkContext";
import Home from "./pages/Home";

// Lazy load pages for code splitting - improves initial load time
const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const CategoryDetail = lazy(() => import("@/pages/CategoryDetail"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Categories = lazy(() => import("@/pages/Categories"));

// Loading fallback for slow networks
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

const isAuthenticated = () => {
  return localStorage.getItem('auth_token') !== null;
};

function App() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <Router>
          <Toaster />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public homepage for non-logged users, dashboard for logged users */}
              <Route 
                path="/" 
                element={<Home />}
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
          </Suspense>
        </Router>
      </NetworkProvider>
    </ThemeProvider>
  );
}

export default App;