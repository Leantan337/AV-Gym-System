import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const AuthTestPage: React.FC = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [testData, setTestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const fetchProtectedData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/me/');
      setTestData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch protected data');
      console.error('Error fetching protected data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Authentication Test Page</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Auth Status</h2>
        <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        {user && (
          <div>
            <p><strong>User:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h3>Login</h3>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
            <div>
              <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <button 
              type="submit"
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                alignSelf: 'flex-start'
              }}
            >
              Login
            </button>
          </form>
        </div>
      ) : (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={logout}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Logout
          </button>

          <button 
            onClick={fetchProtectedData}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#2196F3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Loading...' : 'Test Protected Route'}
          </button>
        </div>
      )}

      {testData && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #4CAF50', borderRadius: '4px' }}>
          <h3>Protected Data:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(testData, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #f44336', borderRadius: '4px', color: '#f44336' }}>
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default AuthTestPage;
