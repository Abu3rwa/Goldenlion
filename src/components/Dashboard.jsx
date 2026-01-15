import React from 'react';
import { useSelector } from 'react-redux';
import { FaBoxOpen, FaDollarSign, FaCoins, FaChartLine } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
  const products = useSelector((state) => state.products.products);

  const totalItems = products.reduce((total, product) => total + product.quantity, 0);
  
  // Capital (Cost Value)
  const totalCost = products.reduce((total, product) => {
    const cost = product.costPrice || 0;
    return total + (product.quantity * cost);
  }, 0);

  // Revenue (Sales Value)
  const totalSalesValue = products.reduce((total, product) => {
     return total + (product.quantity * product.price);
  }, 0);

  const potentialProfit = totalSalesValue - totalCost;

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="dashboard-metrics">
      <div className="metric-card">
        <div className="metric-icon">
          <FaBoxOpen />
        </div>
        <div className="metric-content">
          <h4>إجمالي العناصر</h4>
          <p>{totalItems}</p>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon" style={{color: '#E74C3C', backgroundColor: 'rgba(231, 76, 60, 0.1)'}}>
          <FaCoins />
        </div>
        <div className="metric-content">
          <h4>رأس المال (التكلفة)</h4>
          <p>${formatCurrency(totalCost)}</p>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">
          <FaDollarSign />
        </div>
        <div className="metric-content">
          <h4>القيمة السوقية (البيع)</h4>
          <p>${formatCurrency(totalSalesValue)}</p>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon" style={{color: '#2ECC71', backgroundColor: 'rgba(46, 204, 113, 0.1)'}}>
          <FaChartLine />
        </div>
        <div className="metric-content">
          <h4>الأرباح المتوقعة</h4>
          <p>${formatCurrency(potentialProfit)}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
