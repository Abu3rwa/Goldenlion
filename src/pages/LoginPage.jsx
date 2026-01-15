import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { GiLion } from 'react-icons/gi';
import './LoginPage.css';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, status, error } = useSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegistering) {
      dispatch(register({ email, password }));
    } else {
      dispatch(login({ email, password }));
    }
  };

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
          
          <button 
            type="submit"
            className="login-btn"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              isRegistering ? 'جاري التسجيل...' : 'جاري تسجيل الدخول...'
            ) : (
              isRegistering ? 'تسجيل حساب جديد' : 'تسجيل الدخول'
            )}
          </button>
        </form>

        <button 
          className="toggle-btn"
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ تسجيل حساب جديد'}
        </button>
        
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
