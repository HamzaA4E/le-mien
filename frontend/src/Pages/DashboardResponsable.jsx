import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResponsableLayout from '../components/ResponsableLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const DashboardResponsable = () => {
  const [ticketStats, setTicketStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicketStats = async () => {
      try {
        const response = await axios.get('/api/tickets/stats');
        setTicketStats(response.data);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des statistiques');
        setLoading(false);
        console.error('Erreur:', err);
      }
    };

    fetchTicketStats();
  }, []);

  if (loading) {
    return (
      <ResponsableLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </ResponsableLayout>
    );
  }

  if (error) {
    return (
      <ResponsableLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] text-red-500">
          {error}
        </div>
      </ResponsableLayout>
    );
  }

  return (
    <ResponsableLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Tableau de bord des tickets</h1>
        
        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques des tickets par utilisateur</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Total des tickets</TableHead>
                    <TableHead>Tickets ouverts</TableHead>
                    <TableHead>Tickets en cours</TableHead>
                    <TableHead>Tickets résolus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketStats.map((stat) => (
                    <TableRow key={stat.userId}>
                      <TableCell className="font-medium">{stat.userName}</TableCell>
                      <TableCell>{stat.totalTickets}</TableCell>
                      <TableCell>{stat.openTickets}</TableCell>
                      <TableCell>{stat.inProgressTickets}</TableCell>
                      <TableCell>{stat.resolvedTickets}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsableLayout>
  );
};

export default DashboardResponsable; 