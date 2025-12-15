// src/components/LoginForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../hooks/fetchWithAuth';
import Font from 'react-font';

import styles from '../css/Login.module.css'

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
  
    try {
      const response = await fetchWithAuth('http://localhost:5100/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
  
      const data = await response.json();
      login(data.token);
      navigate('/mis-reservas');
  
    } catch (err) {
      console.log('Login error:', err);
      let errorMessage = 'Credenciales Invalidas';
      
      if (err instanceof Error) {
        try {
          // Parse JSON error if exists
          const errorData = JSON.parse(err.message);
          errorMessage = errorData.error || errorData.message || 'Credenciales Invalidas';
        } catch {
          // Use raw message if not JSON
          errorMessage = err.message;
        }
        
        // Keep error for at least 5 seconds
        setTimeout(() => setError(''), 5000);
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.logincontainer}>
      <form onSubmit={handleSubmit}>
        <Font family="Lexend">
            <h2>Login</h2>
        </Font>
        {error && (
        <div className={styles.errormessage}>
            {error}
            <button 
            onClick={() => setError('')}
            className={styles.errorclose}
            >
            ×
            </button>
        </div>
        )}
        <div className={styles.formgroup}>
            <Font family="Lexend">
                <label htmlFor="username">Usuario:</label>
            </Font>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className={styles.formgroup}>
        <Font family="Lexend">
                <label htmlFor="password">Contraseña:</label>
            </Font>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
