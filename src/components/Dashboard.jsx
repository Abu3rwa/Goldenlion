import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTransactions } from '../store/transactionsSlice';
import { FaBoxOpen, FaCoins, FaChartLine } from 'react-icons/fa';
import { MdArrowDownward, MdArrowUpward, MdTrendingUp } from 'react-icons/md';
import { formatCurrency } from '../utils/currency';
import { fromCents } from '../utils/decimalUtils';
import { TRANSACTION_TYPES } from '../utils/constants';

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
    <div className="container-fluid px-0">
      {/* Current Inventory Section */}
      <h3 className="h4 mb-4 fw-bold border-bottom pb-2">المخزون الحالي</h3>
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="metric-icon fs-2 p-3 rounded bg-primary-subtle text-primary">
                <FaBoxOpen />
              </div>
              <div>
                <h4 className="h6 text-muted mb-1">إجمالي العناصر</h4>
                <p className="h3 mb-0 fw-bold">{totalItems}</p>
                <small className="text-secondary">{totalProducts} منتج في الكتالوج</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="metric-icon fs-2 p-3 rounded bg-danger-subtle text-danger">
                <FaCoins />
              </div>
              <div>
                <h4 className="h6 text-muted mb-1">رأس المال (التكلفة)</h4>
                <p className="h3 mb-0 fw-bold">{formatCurrency(totalCost, currency)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="metric-icon fs-2 p-3 rounded bg-success-subtle text-success">
                <FaChartLine />
              </div>
              <div>
                <h4 className="h6 text-muted mb-1">الأرباح المتوقعة</h4>
                <p className="h3 mb-0 fw-bold">{formatCurrency(potentialProfit, currency)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Totals Section */}
      <h3 className="h4 mb-4 fw-bold border-bottom pb-2">إجمالي الحركات (كل الوقت)</h3>
      <div className="row g-4">
        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="metric-icon fs-2 p-3 rounded bg-success-subtle text-success">
                <MdArrowDownward />
              </div>
              <div>
                <h4 className="h6 text-muted mb-1">إجمالي الوارد (Stock IN)</h4>
                <p className="h3 mb-0 fw-bold">{formatCurrency(totalStockInValue, currency)}</p>
                <small className="text-secondary">{stockInTransactions.length} عملية استلام</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="metric-icon fs-2 p-3 rounded bg-danger-subtle text-danger">
                <MdArrowUpward />
              </div>
              <div>
                <h4 className="h6 text-muted mb-1">إجمالي الصادر (Stock OUT)</h4>
                <p className="h3 mb-0 fw-bold">{formatCurrency(totalStockOutValue, currency)}</p>
                <small className="text-secondary">{stockOutTransactions.length} عملية إخراج</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="metric-icon fs-2 p-3 rounded bg-info-subtle text-info">
                <MdTrendingUp />
              </div>
              <div>
                <h4 className="h6 text-muted mb-1">الأرباح المحققة</h4>
                <p className={`h3 mb-0 fw-bold ${realizedProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(realizedProfit, currency)}
                </p>
                <small className="text-secondary">من المبيعات الفعلية</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
