import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MDBBtn,
  MDBContainer,
  MDBCard,
  MDBCardBody,
  MDBRow,
  MDBCol,
  MDBIcon,
  MDBInput,
  MDBCardText
} from 'mdb-react-ui-kit';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsSubmitting(true);
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MDBContainer fluid className="min-vh-100 d-flex align-items-center justify-content-center p-3">
      <MDBCard className="w-100 shadow-5" style={{ maxWidth: '950px', borderRadius: '1rem' }}>
        <MDBRow className="g-0">
          {/* Left Form Section */}
          <MDBCol md="6" className="p-5 d-flex flex-column justify-content-center">
            <div className="text-center text-md-start mb-4">
              <MDBIcon fas icon="dumbbell" size="2x" className="text-primary mb-2" />
              <h3 className="fw-bold mb-1">AV Gym System</h3>
              <p className="text-muted">Sign in to your account</p>
            </div>

            {error && (
              <MDBCardText className="text-danger mb-3">
                {error}
              </MDBCardText>
            )}

            <form onSubmit={handleSubmit}>
              <MDBInput
                label="Username"
                id="username"
                type="text"
                size="lg"
                className="mb-3"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <MDBInput
                label="Password"
                id="password"
                type="password"
                size="lg"
                className="mb-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="d-flex justify-content-between align-items-center mb-3">
                <a href="#!" className="small text-muted">Forgot password?</a>
              </div>

              <MDBBtn
                className="w-100"
                color="dark"
                size="lg"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </MDBBtn>
            </form>

            <p className="text-center text-muted mt-4 mb-0">
              Don't have an account? <a href="#!" className="text-primary">Register here</a>
            </p>
          </MDBCol>

          {/* Right Image Section */}
          <MDBCol md="6" className="d-none d-md-block">
            <div style={{ height: '100%', overflow: 'hidden', borderTopRightRadius: '1rem', borderBottomRightRadius: '1rem' }}>
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1470&q=80"
                alt="Gym"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </MDBCol>
        </MDBRow>
      </MDBCard>
    </MDBContainer>
  );
};

export default LoginPage;
