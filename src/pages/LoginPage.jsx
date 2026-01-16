import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { inviteService } from '../services/inviteService';
import { isValidEmail, isValidPassword, ValidationMessages } from '../utils/validation';
import { GiLion } from 'react-icons/gi';
import { MdVpnKey } from 'react-icons/md';
import './LoginPage.css';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, status, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!isValidEmail(email)) {
      setValidationError(ValidationMessages.INVALID_EMAIL);
      return;
    }

    if (isRegistering) {
      if (!isValidPassword(password)) {
        setValidationError(ValidationMessages.INVALID_PASSWORD);
        return;
      }

      // Validate invite code first
      setIsValidating(true);
      try {
        const validation = await inviteService.validateInvite(email, inviteCode);

        if (!validation.valid) {
          setValidationError(validation.error);
          setIsValidating(false);
          return;
        }

        // Proceed with registration - include invite info
        const result = await dispatch(register({
          email,
          password,
          inviteId: validation.invite.id,
          assignedRole: validation.invite.role
        })).unwrap();

        // Mark invite as used after successful registration
        if (result && validation.invite) {
          try {
            await inviteService.markAsUsed(validation.invite.id);
          } catch (error) {
            console.error('Failed to mark invite as used:', error);
          }
        }
      } catch (err) {
        setValidationError(err.message || 'فشل التسجيل');
      }
      setIsValidating(false);
    } else {
      dispatch(login({ email, password }));
    }
  };

  const displayError = validationError || error;

  return (
    <div className="login-page d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card shadow border-0" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card-body p-4 text-center">
          <div className="text-gold mb-3" style={{ fontSize: '4rem' }}>
            <GiLion />
          </div>
          <h2 className="card-title fw-bold text-dark mb-1">الأسد الذهبي</h2>
          <p className="text-muted mb-4">نظام إدارة المخزون</p>

          <form onSubmit={handleSubmit} className="text-end">
            <div className="mb-3">
              <input
                type="email"
                className="form-control form-control-lg"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control form-control-lg"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Invite Code - Only for Registration */}
            {isRegistering && (
              <div className="mb-3">
                <label className="form-label d-flex align-items-center gap-2 text-gold fw-bold">
                  <MdVpnKey />
                  <span>رمز الدعوة</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-lg text-uppercase"
                  placeholder="أدخل رمز الدعوة"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  maxLength={8}
                />
                <div className="form-text text-muted small mt-1">
                  تحتاج إلى رمز دعوة من مالك النظام للتسجيل (صالح لمدة 7 أيام)
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-gold w-100 py-2 fs-5 mb-3"
              disabled={status === 'loading' || isValidating}
            >
              {(status === 'loading' || isValidating) ? (
                isRegistering ? 'جاري التحقق والتسجيل...' : 'جاري تسجيل الدخول...'
              ) : (
                isRegistering ? 'تسجيل حساب جديد' : 'تسجيل الدخول'
              )}
            </button>
          </form>

          <button
            className="btn btn-link text-decoration-none text-gold"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setValidationError('');
            }}
          >
            {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'لديك رمز دعوة؟ تسجيل حساب جديد'}
          </button>

          {displayError && (
            <div className="alert alert-danger mt-3 mb-0 py-2 small">
              {displayError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
