import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../Pages/LoginPage';
import Dashboard from '../Pages/Dashboard';
import TicketList from '../Pages/TicketList';
import ChatBot from '../components/ChatBot/ChatBot';
import CreateUser from '../Pages/CreateUser';
import Profile from '../Pages/Profile';
import ListUsers from '../Pages/ListUsers';
import TicketDetails from '../Pages/TicketDetails';
import EditTicket from '../Pages/EditTicket';
import AdminEntitiesManagement from '../Pages/AdminEntitiesManagement';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const ErrorBoundary = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-600">Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/dashboard',
    element: <PrivateRoute><Dashboard /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/tickets',
    element: <PrivateRoute><TicketList /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/tickets/:id',
    element: <PrivateRoute><TicketDetails /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/tickets/:id/edit',
    element: <PrivateRoute><EditTicket /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/create-ticket',
    element: <PrivateRoute><ChatBot /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/create-user',
    element: <PrivateRoute><CreateUser /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/profile',
    element: <PrivateRoute><Profile /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/users',
    element: <PrivateRoute><ListUsers /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/admin/entities',
    element: <PrivateRoute><AdminEntitiesManagement /></PrivateRoute>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
