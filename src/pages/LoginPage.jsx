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
    <div className="login-page">
      <div className="login-card">
        <GiLion className="login-icon" />
        <h2>الأسد الذهبي</h2>
        <p>نظام إدارة المخزون</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </div>

          {/* Invite Code - Only for Registration */}
          {isRegistering && (
            <div className="form-group invite-code-group">
              <div className="invite-code-label">
                <MdVpnKey />
                <span>رمز الدعوة</span>
              </div>
              <input
                type="text"
                placeholder="أدخل رمز الدعوة المكون من 8 أحرف"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="login-input invite-input"
                maxLength={8}
              />
              <small className="invite-hint">
                تحتاج إلى رمز دعوة من مالك النظام للتسجيل (صالح لمدة 7 أيام)
              </small>
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
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
          className="toggle-btn"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setValidationError('');
          }}
        >
          {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'لديك رمز دعوة؟ تسجيل حساب جديد'}
        </button>

        {displayError && <p className="error-msg">{displayError}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
