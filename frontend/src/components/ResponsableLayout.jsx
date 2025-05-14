import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, User } from 'lucide-react';

const ResponsableLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Gestion des Tickets</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/dashboard-responsable">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Link to="/profil">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profil</span>
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default ResponsableLayout; 