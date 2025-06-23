import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MDBBtn,
  MDBContainer,
  MDBCard,
  MDBCardBody,
  MDBCardImage,
  MDBRow,
  MDBCol,
  MDBIcon,
  MDBInput
} from 'mdb-react-ui-kit';
import { api } from '../../services/api';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const response = await api.post('/api/auth/password-reset/', { email });
      setMessage({
        type: 'success',
        text: response.data.message || 'Password reset email sent successfully!'
      });
      setEmail('');
    } catch (error: unknown) {
      console.error('Password reset request failed:', error);
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Failed to send password reset email. Please try again.'
      });
    } finally {
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
              alt="forgot password form" 
              className='rounded-start w-100'
            />
          </MDBCol>

          <MDBCol md='6'>
            <MDBCardBody className='d-flex flex-column'>
              <div className='d-flex flex-row mt-2'>
                <MDBIcon fas icon="cubes fa-3x me-3" style={{ color: '#ff6219' }}/>
                <span className="h1 fw-bold mb-0">AV Gym System</span>
              </div>

              <h5 className="fw-normal my-4 pb-3" style={{letterSpacing: '1px'}}>
                Forgot Your Password?
              </h5>

              <p className="text-muted mb-4">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {message && (
                <div 
                  className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mb-4`}
                  role="alert"
                >
                  {message.text}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage(null)}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <MDBInput 
                  wrapperClass='mb-4' 
                  label='Email Address' 
                  id='email' 
                  type='email' 
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <MDBBtn 
                  className="mb-4 px-5" 
                  color='dark' 
                  size='lg' 
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </MDBBtn>
              </form>

              <div className="text-center">
                <Link to="/login" className="text-decoration-none">
                  <MDBBtn color="link" className="mb-2">
                    Back to Login
                  </MDBBtn>
                </Link>
              </div>

              <div className='d-flex flex-row justify-content-start mt-4'>
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

export default ForgotPasswordPage;