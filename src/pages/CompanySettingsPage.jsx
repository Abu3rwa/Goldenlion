import React, { useState } from 'react';
import CompanySettingsForm from '../components/CompanySettingsForm';
import ChatbotInfoForm from '../components/ChatbotInfoForm';
import { MdSettings, MdSmartToy } from 'react-icons/md';
import './CompanySettingsPage.css';

const CompanySettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="company-settings-page container">
      <h1 className="settings-page-title">
        <MdSettings className="title-icon" /> الإعدادات
      </h1>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          <MdSettings /> إعدادات الشركة
        </button>
        <button
          className={`settings-tab ${activeTab === 'chatbot' ? 'active' : ''}`}
          onClick={() => setActiveTab('chatbot')}
        >
          <MdSmartToy /> معلومات الشات بوت
        </button>
      </div>

      <div className="settings-tab-content">
        {activeTab === 'company' && <CompanySettingsForm />}
        {activeTab === 'chatbot' && <ChatbotInfoForm />}
      </div>
    </div>
  );
};

export default CompanySettingsPage;
