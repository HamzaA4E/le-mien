import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../Pages/LoginPage';
import Dashboard from '../Pages/Dashboard';
import CreateTicket from '../Pages/CreateTicket';
import CreateUser from '../Pages/CreateUser';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/dashboard',
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/tickets/create',
    element: <CreateTicket />
  },
  {
    path: '/utilisateurs/create',
    element: (
      <PrivateRoute>
        <CreateUser />
      </PrivateRoute>
    ),
  },
], {
  future: {
    v7_startTransition: true
  }
});

export default router;
