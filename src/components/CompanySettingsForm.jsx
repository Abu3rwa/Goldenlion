import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCompanySettings } from '../store/companySlice';
import { companyService } from '../services/companyService';
import './CompanySettingsForm.css';

const CompanySettingsForm = () => {
  const dispatch = useDispatch();
  const companySettings = useSelector((state) => state.company);

  const [companyName, setCompanyName] = useState(companySettings.companyName);
  const [currency, setCurrency] = useState(companySettings.currency);
  const [language, setLanguage] = useState(companySettings.language);

  useEffect(() => {
    setCompanyName(companySettings.companyName);
    setCurrency(companySettings.currency);
    setLanguage(companySettings.language);
  }, [companySettings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newSettings = { companyName, currency, language };
    companyService.saveCompanySettings(newSettings).then(savedSettings => {
      dispatch(setCompanySettings(savedSettings));
    });
  };

  return (
    <form onSubmit={handleSubmit} className="company-settings-form">
      <div className="form-group">
        <label htmlFor="companyName">Company Name</label>
        <input
          type="text"
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="currency">Currency</label>
        <input
          type="text"
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="language">Language</label>
        <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </select>
      </div>
      <button type="submit">Save Settings</button>
    </form>
  );
};

export default CompanySettingsForm;
