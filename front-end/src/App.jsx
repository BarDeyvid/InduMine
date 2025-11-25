// src/App.jsx 
import React from 'react';
import AppRouter from './AppRouter';
import { AuthProvider } from './auth/authContext';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}