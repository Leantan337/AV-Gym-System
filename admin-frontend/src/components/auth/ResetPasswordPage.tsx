import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { uid, token } = useParams<{ uid: string; token: string }>();

  useEffect(() => {
    // Validate token on component mount
    if (uid && token) {
      setIsValidToken(true); // For now, assume valid - could add token validation endpoint
    } else {
      setIsValidToken(false);
      setMessage({
        type: 'error',
        text: 'Invalid reset link. Please request a new password reset.'
      });
    }
  }, [uid, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword || isSubmitting || !uid || !token) return;

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match.'
      });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters long.'
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const response = await api.post('/api/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      
      setMessage({
        type: 'success',
        text: response.data.message || 'Password reset successfully!'
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error: unknown) {
      console.error('Password reset failed:', error);
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.error || apiError.response?.data?.message || 'Failed to reset password. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidToken === null) {
    return (
      <MDBContainer className="my-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </MDBContainer>
    );
  }

  if (isValidToken === false) {
    return (
      <MDBContainer className="my-5">
        <MDBCard>
          <MDBRow className='g-0'>
            <MDBCol md='6'>
              <MDBCardImage 
                src='https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/img1.webp' 
                alt="reset password form" 
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
                  Invalid Reset Link
                </h5>

                {message && (
                  <div 
                    className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-4`}
                    role="alert"
                  >
                    {message.text}
                  </div>
                )}

                <div className="text-center">
                  <Link to="/forgot-password" className="text-decoration-none">
                    <MDBBtn color="primary" className="mb-2">
                      Request New Reset Link
                    </MDBBtn>
                  </Link>
                </div>

                <div className="text-center">
                  <Link to="/login" className="text-decoration-none">
                    <MDBBtn color="link" className="mb-2">
                      Back to Login
                    </MDBBtn>
                  </Link>
                </div>
              </MDBCardBody>
            </MDBCol>
          </MDBRow>
        </MDBCard>
      </MDBContainer>
    );
  }

  return (
    <MDBContainer className="my-5">
      <MDBCard>
        <MDBRow className='g-0'>
          <MDBCol md='6'>
            <MDBCardImage 
              src='https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/img1.webp' 
              alt="reset password form" 
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
                Reset Your Password
              </h5>

              <p className="text-muted mb-4">
                Enter your new password below.
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
                  label='New Password' 
                  id='newPassword' 
                  type='password' 
                  size="lg"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <MDBInput 
                  wrapperClass='mb-4' 
                  label='Confirm New Password' 
                  id='confirmPassword' 
                  type='password' 
                  size="lg"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <MDBBtn 
                  className="mb-4 px-5" 
                  color='dark' 
                  size='lg' 
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage;