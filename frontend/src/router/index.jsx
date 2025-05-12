import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../Pages/LoginPage';
import Dashboard from '../Pages/Dashboard';
import TicketList from '../Pages/TicketList';
import CreateTicket from '../Pages/CreateTicket';
import CreateUser from '../Pages/CreateUser';
import Profile from '../Pages/Profile';
import ListUsers from '../Pages/ListUsers';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return null;
  }
  return children;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <PrivateRoute><Dashboard /></PrivateRoute>,
  },
  {
    path: '/tickets',
    element: <PrivateRoute><TicketList /></PrivateRoute>,
  },
  {
    path: '/create-ticket',
    element: <PrivateRoute><CreateTicket /></PrivateRoute>,
  },
  {
    path: '/create-user',
    element: <PrivateRoute><CreateUser /></PrivateRoute>,
  },
  {
    path: '/profile',
    element: <PrivateRoute><Profile /></PrivateRoute>,
  },
  {
    path: '/users',
    element: <PrivateRoute><ListUsers /></PrivateRoute>,
  },
]);

export default router;
