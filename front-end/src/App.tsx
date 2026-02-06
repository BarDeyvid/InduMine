import { lazy, Suspense, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./context/ThemeContext";
import { NetworkProvider } from "./context/NetworkContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminRoute, PrivateRoute } from "./components/PrivateRoute";
import Home from "./pages/Home";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting - improves initial load time
const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const CategoryDetail = lazy(() => import("@/pages/CategoryDetail"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const Categories = lazy(() => import("@/pages/Categories"));
const Admin = lazy(() => import("@/pages/Admin"));

// Loading fallback for slow networks
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Routes component that uses auth context
function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public homepage for non-logged users, dashboard for logged users */}
        <Route 
          path="/" 
          element={<Home />}
        />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route 
            path="/dashboard" 
            element={<Index />}
          />
          
          <Route 
            path="/categories/:slug" 
            element={<CategoryDetail />}
          />
          
          <Route 
            path="/categories"
            element={<Categories />}
          />
          
          <Route 
            path="/products/:id" 
            element={<ProductDetail />}
          />
        </Route>

          <Route 
            path="/search" 
            element={<SearchPage />} 
            />

        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'pt');
  return (
    <ThemeProvider>
      <AuthProvider>
        <NetworkProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Toaster />
            <AppRoutes />
          </Router>
        </NetworkProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;