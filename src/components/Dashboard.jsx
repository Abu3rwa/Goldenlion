import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTransactions } from '../store/transactionsSlice';
import { FaBoxOpen, FaCoins, FaChartLine } from 'react-icons/fa';
import { MdArrowDownward, MdArrowUpward, MdTrendingUp } from 'react-icons/md';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import { TRANSACTION_TYPES } from '../utils/constants';
import './Dashboard.css';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { products, status } = useSelector((state) => state.products);
  const { transactions } = useSelector((state) => state.transactions);
  const { currency } = useSelector((state) => state.company);

  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch]);

  // Current inventory stats
  const totalItems = products.reduce((total, product) => total + product.quantity, 0);
  const totalProducts = products.length; // Total unique products (catalog)

  // Capital (Cost Value) of current stock
  const totalCost = products.reduce((total, product) => {
    const cost = product.costPrice || 0;
    return total + (product.quantity * cost);
  }, 0);

  // Revenue (Sales Value) of current stock
  const totalSalesValue = products.reduce((total, product) => {
    return total + (product.quantity * product.price);
  }, 0);

  const potentialProfit = totalSalesValue - totalCost;

  // Transaction totals (all-time)
  const stockInTransactions = transactions.filter(t => t.type === TRANSACTION_TYPES.STOCK_IN);
  const stockOutTransactions = transactions.filter(t => t.type === TRANSACTION_TYPES.STOCK_OUT);

  const totalStockInValue = stockInTransactions.reduce((sum, tx) =>
    sum + fromCents(tx.totalCostCents || 0), 0
  );

  const totalStockOutValue = stockOutTransactions.reduce((sum, tx) =>
    sum + fromCents(tx.totalPriceCents || 0), 0
  );

  const totalStockOutCost = stockOutTransactions.reduce((sum, tx) =>
    sum + fromCents(tx.totalCostCents || 0), 0
  );

  const realizedProfit = totalStockOutValue - totalStockOutCost;

  if (status === 'loading') {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>جاري التحميل...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Current Inventory Section */}
      <h3 className="section-title">المخزون الحالي</h3>
      <div className="dashboard-metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <FaBoxOpen />
          </div>
          <div className="metric-content">
            <h4>إجمالي العناصر</h4>
            <p>{totalItems}</p>
            <small>{totalProducts} منتج في الكتالوج</small>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ color: '#E74C3C', backgroundColor: 'rgba(231, 76, 60, 0.1)' }}>
            <FaCoins />
          </div>
          <div className="metric-content">
            <h4>رأس المال (التكلفة)</h4>
            <p>{formatCurrency(totalCost, currency)}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ color: '#2ECC71', backgroundColor: 'rgba(46, 204, 113, 0.1)' }}>
            <FaChartLine />
          </div>
          <div className="metric-content">
            <h4>الأرباح المتوقعة</h4>
            <p>{formatCurrency(potentialProfit, currency)}</p>
          </div>
        </div>
      </div>

      {/* Transaction Totals Section */}
      <h3 className="section-title">إجمالي الحركات (كل الوقت)</h3>
      <div className="dashboard-metrics">
        <div className="metric-card stock-in-card">
          <div className="metric-icon" style={{ color: '#27AE60', backgroundColor: 'rgba(39, 174, 96, 0.1)' }}>
            <MdArrowDownward />
          </div>
          <div className="metric-content">
            <h4>إجمالي الوارد (Stock IN)</h4>
            <p>{formatCurrency(totalStockInValue, currency)}</p>
            <small>{stockInTransactions.length} عملية استلام</small>
          </div>
        </div>

        <div className="metric-card stock-out-card">
          <div className="metric-icon" style={{ color: '#E74C3C', backgroundColor: 'rgba(231, 76, 60, 0.1)' }}>
            <MdArrowUpward />
          </div>
          <div className="metric-content">
            <h4>إجمالي الصادر (Stock OUT)</h4>
            <p>{formatCurrency(totalStockOutValue, currency)}</p>
            <small>{stockOutTransactions.length} عملية إخراج</small>
          </div>
        </div>

        <div className="metric-card profit-card">
          <div className="metric-icon" style={{ color: '#9B59B6', backgroundColor: 'rgba(155, 89, 182, 0.1)' }}>
            <MdTrendingUp />
          </div>
          <div className="metric-content">
            <h4>الأرباح المحققة</h4>
            <p className={realizedProfit >= 0 ? 'profit-positive' : 'profit-negative'}>
              {formatCurrency(realizedProfit, currency)}
            </p>
            <small>من المبيعات الفعلية</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
