import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signIn } from 'aws-amplify/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signIn({ username: email, password });
    } catch (error) {
      console.error('Error during sign in:', error);
      
      // Handling different error scenarios
  if (error.message.includes('User does not exist')) {
    setError('No account found with this email address. Need an account? Sign up now.');
  } else if (error.message.includes('Incorrect username or password')) {
    setError('Incorrect password');
    setShowForgotPassword(true);
  } else {
    setError('An error occurred. Please try again.');
  }
}
  };

  return (
    <div className="auth-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Main Login Form */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '1rem'
      }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Log In</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'red', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {error}
            </div>
          )}

          {showForgotPassword && (
            <Link 
              to="/forgot-password" 
              style={{ 
                color: '#67cad8', 
                textDecoration: 'none', 
                fontSize: '0.9rem' 
              }}
            >
              Forgot your password?
            </Link>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: '#67cad8',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Log In
          </button>
        </form>
      </div>

      {/* Sign Up Link */}
      <div style={{
        textAlign: 'center',
        marginTop: '1rem',
        color: '#666'
      }}>
        Not a current user? {' '}
        <Link 
          to="/signup" 
          style={{ 
            color: '#67cad8', 
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Sign up HERE
        </Link>
      </div>
    </div>
  );
};

export default Login;