// src/pages/Home.tsx
import { getAuthToken } from "@/lib/api";
import Index from "./Index";
import PublicHome from "./PublicHome";

export default function Home() {
  // Check if the auth_token exists in localStorage via your API utility
  const isAuthenticated = !!getAuthToken();

  // If authenticated, render the Dashboard; otherwise, the Landing Page
  return isAuthenticated ? <Index /> : <PublicHome />;
}