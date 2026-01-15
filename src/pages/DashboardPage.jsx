import React from 'react';
import ProductList from '../components/ProductList';
import Dashboard from '../components/Dashboard';

const DashboardPage = () => {
  return (
    <div>
      <Dashboard />
      <ProductList />
    </div>
  );
};

export default DashboardPage;
