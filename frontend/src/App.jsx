import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Dashboard from './Pages/Dashboard';
import CreateTicket from './Pages/CreateTicket';
import TicketList from './Pages/TicketList';
import TicketDetails from './Pages/TicketDetails';
import EditTicket from './Pages/EditTicket';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/tickets/create" element={<PrivateRoute><CreateTicket /></PrivateRoute>} />
        <Route path="/tickets" element={<PrivateRoute><TicketList /></PrivateRoute>} />
        <Route path="/tickets/:id" element={<PrivateRoute><TicketDetails /></PrivateRoute>} />
        <Route path="/tickets/:id/edit" element={<PrivateRoute><EditTicket /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;