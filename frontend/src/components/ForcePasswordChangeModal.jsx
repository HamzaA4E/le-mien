import React, { useState } from 'react';
import axios from '../utils/axios';
import { FaLock, FaExclamationTriangle, FaCheck, FaSpinner } from 'react-icons/fa';

const ForcePasswordChangeModal = ({ isOpen, onPasswordChanged }) => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculer la force du mot de passe
    if (name === 'new_password') {
      let strength = 0;
      if (value.length >= 8) strength += 1;
      if (/[A-Z]/.test(value)) strength += 1;
      if (/[a-z]/.test(value)) strength += 1;
      if (/[0-9]/.test(value)) strength += 1;
      if (/[^A-Za-z0-9]/.test(value)) strength += 1;
      setPasswordStrength(strength);
    }
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(formData.new_password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.');
      return;
    }

    if (formData.new_password !== formData.new_password_confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/change-password', formData);
      onPasswordChanged();
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-red-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-green-500';
      case 5: return 'bg-green-500';
      default: return 'bg-gray-200';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0: return 'Très faible';
      case 1: return 'Faible';
      case 2: return 'Moyen';
      case 3: return 'Bon';
      case 4: return 'Fort';
      case 5: return 'Très fort';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaLock className="mr-2 text-blue-500" />
            Changement de mot de passe obligatoire
          </h2>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <FaExclamationTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          {/* <p className="text-blue-700">
            Pour des raisons de sécurité, vous devez changer votre mot de passe avant de continuer.
          </p> */}
        {/* </div> */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current_password">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type="password"
                id="current_password"
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <FaLock className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new_password">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                id="new_password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength="8"
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$"
                title="Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
              />
              <FaLock className="absolute left-3 top-3 text-gray-400" />
            </div>
            {formData.new_password && (
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm mt-1 text-gray-600">
                  Force du mot de passe : <span className="font-medium">{getPasswordStrengthText()}</span>
                </p>
                <ul className="text-xs mt-2 text-gray-600 space-y-1">
                  <li className={`flex items-center ${formData.new_password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                    {formData.new_password.length >= 8 ? <FaCheck className="mr-1" /> : <FaExclamationTriangle className="mr-1" />}
                    Au moins 8 caractères
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(formData.new_password) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[A-Z]/.test(formData.new_password) ? <FaCheck className="mr-1" /> : <FaExclamationTriangle className="mr-1" />}
                    Au moins une majuscule
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(formData.new_password) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[a-z]/.test(formData.new_password) ? <FaCheck className="mr-1" /> : <FaExclamationTriangle className="mr-1" />}
                    Au moins une minuscule
                  </li>
                  <li className={`flex items-center ${/[0-9]/.test(formData.new_password) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[0-9]/.test(formData.new_password) ? <FaCheck className="mr-1" /> : <FaExclamationTriangle className="mr-1" />}
                    Au moins un chiffre
                  </li>
                  <li className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.new_password) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[^A-Za-z0-9]/.test(formData.new_password) ? <FaCheck className="mr-1" /> : <FaExclamationTriangle className="mr-1" />}
                    Au moins un caractère spécial
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new_password_confirmation">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                id="new_password_confirmation"
                name="new_password_confirmation"
                value={formData.new_password_confirmation}
                onChange={handleChange}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength="8"
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$"
                title="Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
              />
              <FaLock className="absolute left-3 top-3 text-gray-400" />
            </div>
            {formData.new_password_confirmation && (
              <p className="text-sm mt-1 text-gray-600">
                {formData.new_password === formData.new_password_confirmation ? (
                  <span className="text-green-600 flex items-center">
                    <FaCheck className="mr-1" /> Les mots de passe correspondent
                  </span>
                ) : (
                  <span className="text-red-600">Les mots de passe ne correspondent pas</span>
                )}
              </p>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={loading || formData.new_password !== formData.new_password_confirmation}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center ${
                loading || formData.new_password !== formData.new_password_confirmation ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Changement en cours...
                </>
              ) : (
                'Changer le mot de passe'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;