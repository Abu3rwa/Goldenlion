import React from 'react';
import { useSelector } from 'react-redux';
import ProductList from '../components/ProductList';
import Dashboard from '../components/Dashboard';

const DashboardPage = () => {
  const { currency } = useSelector((state) => state.company);
  return (
    <div>
      <Dashboard key={currency} />
      <ProductList currency={currency} />
    </div>
  );
};

export default DashboardPage;
