import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MDBBtn,
  MDBContainer,
  MDBCard,
  MDBCardBody,
  MDBCardImage,
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
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <MDBContainer className="my-5">
      <MDBCard>
        <MDBRow className='g-0'>
          <MDBCol md='6'>
            <MDBCardImage 
              src='https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/img1.webp' 
              alt="login form" 
              className='rounded-start w-100'
            />
          </MDBCol>

          <MDBCol md='6'>
            <MDBCardBody className='d-flex flex-column'>
              <div className='d-flex flex-row mt-2'>
                <MDBIcon fas icon="cubes fa-3x me-3" style={{ color: '#ff6219' }}/>
                <span className="h1 fw-bold mb-0">AV Gym System</span>
              </div>

              <h5 className="fw-normal my-4 pb-3" style={{letterSpacing: '1px'}}>Sign into your account</h5>

              {error && (
                <MDBCardText className="text-danger mb-4">
                  {error}
                </MDBCardText>
              )}

              <form onSubmit={handleSubmit}>
                <MDBInput 
                  wrapperClass='mb-4' 
                  label='Username' 
                  id='username' 
                  type='text' 
                  size="lg"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <MDBInput 
                  wrapperClass='mb-4' 
                  label='Password' 
                  id='password' 
                  type='password' 
                  size="lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <MDBBtn 
                  className="mb-4 px-5" 
                  color='dark' 
                  size='lg' 
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </MDBBtn>
              </form>

              <Link to="/forgot-password" className="small text-muted">Forgot password?</Link>
              <p className="mb-5 pb-lg-2" style={{color: '#393f81'}}>
                Don&apos;t have an account? <a href="#!" style={{color: '#393f81'}}>Register here</a>
              </p>

              <div className='d-flex flex-row justify-content-start'>
                <a href="#!" className="small text-muted me-1">Terms of use.</a>
                <a href="#!" className="small text-muted">Privacy policy</a>
              </div>
            </MDBCardBody>
          </MDBCol>
        </MDBRow>
      </MDBCard>
    </MDBContainer>
  );
};

export default LoginPage;
