import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCompanySettings } from '../store/companySlice';
import { companyService } from '../services/companyService';
import { MdSave, MdSettings, MdLocationOn, MdPhone, MdDescription, MdLanguage, MdAttachMoney, MdBusiness } from 'react-icons/md';
import './CompanySettingsForm.css';

const CompanySettingsForm = () => {
  const dispatch = useDispatch();
  const companySettings = useSelector((state) => state.company);

  const [companyName, setCompanyName] = useState(companySettings.companyName || '');
  const [currency, setCurrency] = useState(companySettings.currency || 'د.ل');
  const [language, setLanguage] = useState(companySettings.language || 'ar');
  const [address, setAddress] = useState(companySettings.address || '');
  const [phone, setPhone] = useState(companySettings.phone || '');
  const [terms, setTerms] = useState(companySettings.terms || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setCompanyName(companySettings.companyName || '');
    setCurrency(companySettings.currency || 'د.ل');
    setLanguage(companySettings.language || 'ar');
    setAddress(companySettings.address || '');
    setPhone(companySettings.phone || '');
    setTerms(companySettings.terms || '');
  }, [companySettings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    
    const newSettings = { 
      companyName, 
      currency, 
      language,
      address,
      phone,
      terms
    };

    companyService.saveCompanySettings(newSettings).then(savedSettings => {
      dispatch(setCompanySettings(savedSettings));
      setIsSaving(false);
      setMessage('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setMessage(''), 3000);
    });
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
        <h4 className="card-title text-gold fw-bold mb-0 d-flex align-items-center gap-2">
          <MdSettings /> إعدادات الشركة والفواتير
        </h4>
      </div>
      <div className="card-body">
        {message && <div className="alert alert-success">{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* Basic Info */}
            <div className="col-md-6">
              <label className="form-label fw-bold small text-muted">
                <MdBusiness className="text-gold ms-1" /> اسم الشركة
              </label>
              <input
                type="text"
                className="form-control"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: الأسد الذهبي"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-bold small text-muted">
                <MdAttachMoney className="text-gold ms-1" /> العملة
              </label>
              <input
                type="text"
                className="form-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="د.ل"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-bold small text-muted">
                <MdLanguage className="text-gold ms-1" /> اللغة
              </label>
              <select 
                className="form-select"
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Contact Info */}
            <div className="col-md-6">
              <label className="form-label fw-bold small text-muted">
                <MdLocationOn className="text-gold ms-1" /> العنوان (يظهر في الفاتورة)
              </label>
              <input
                type="text"
                className="form-control"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: طرابلس - حي الأندلس"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold small text-muted">
                <MdPhone className="text-gold ms-1" /> رقم الهاتف (يظهر في الفاتورة)
              </label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="091-0000000"
              />
            </div>

            {/* Terms */}
            <div className="col-12">
              <label className="form-label fw-bold small text-muted">
                <MdDescription className="text-gold ms-1" /> الشروط والأحكام (تظهر أسفل الفاتورة)
              </label>
              <textarea
                className="form-control"
                rows="4"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="مثال: البضاعة المباعة لا ترد ولا تستبدل بعد 14 يوم..."
              ></textarea>
            </div>

            <div className="col-12 mt-4 text-start">
              <button 
                type="submit" 
                className="btn btn-gold px-4 py-2 d-flex align-items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? 'جاري الحفظ...' : (
                  <>
                    <MdSave /> حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySettingsForm;
