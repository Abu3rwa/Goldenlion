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

  // Sort transactions by date (newest first)
  const recentTransactions = [...transactions]
    .sort((a, b) => {
      const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt);
      const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt);
      return dateB - dateA;
    })
    .slice(0, 5);

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-gold" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
        <span className="ms-2 fw-bold text-muted">جاري تحميل البيانات...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid px-2 px-md-4 pb-5">

      {/* Welcome Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom border-light">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>لوحة التحكم</h2>
          <p className="text-muted small mb-0">نظرة عامة على أداء المتجر والمخزون</p>
        </div>
        <div className="mt-3 mt-md-0 d-flex align-items-center gap-3">
          <div className="bg-white px-3 py-2 rounded shadow-sm border">
            <small className="text-muted d-block text-uppercase" style={{ fontSize: '0.65rem' }}>التاريخ اليوم</small>
            <div className="fw-bold text-dark">{new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="row g-3 g-md-4 mb-5">

        {/* Total Stats Card - Gold Theme */}
        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)', color: 'white' }}>
            <div className="card-body position-relative">
              <div className="d-flex justify-content-between align-items-start z-1 position-relative">
                <div>
                  <div className="text-white-50 small text-uppercase mb-1">رأس المال (التكلفة)</div>
                  <h3 className="fw-bold mb-0 text-gold" style={{ color: '#c5a059' }}>{formatCurrency(totalCost, currency)}</h3>
                </div>
                <div className="p-2 rounded bg-white bg-opacity-10 text-gold" style={{ color: '#c5a059' }}>
                  <FaCoins className="fs-4" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-top border-secondary border-opacity-50">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-white-50">عدد المنتجات</span>
                  <span className="fw-bold">{totalItems} <small className="fw-normal text-white-50">قطعة</small></span>
                </div>
              </div>
              {/* Decorative Circle */}
              <div className="position-absolute rounded-circle bg-gold opacity-10" style={{ width: '150px', height: '150px', top: '-50px', left: '-50px', backgroundColor: '#c5a059', opacity: 0.1 }}></div>
            </div>
          </div>
        </div>

        {/* Sales Stats Card - White Theme */}
        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small text-uppercase mb-1">المبيعات المتوقعة</div>
                  <h3 className="fw-bold mb-0 text-dark">{formatCurrency(totalSalesValue, currency)}</h3>
                </div>
                <div className="p-2 rounded bg-success bg-opacity-10 text-success">
                  <MdTrendingUp className="fs-4" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-muted">الأرباح المتوقعة</span>
                  <span className="fw-bold text-success">+{formatCurrency(potentialProfit, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Realized Profit Card - Highlight */}
        <div className="col-12 col-md-4">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRight: '4px solid #c5a059' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small text-uppercase mb-1">الأرباح المحققة (الصافي)</div>
                  <h3 className={`fw-bold mb-0 ${realizedProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {realizedProfit > 0 ? '+' : ''}{formatCurrency(realizedProfit, currency)}
                  </h3>
                </div>
                <div className={`p-2 rounded ${realizedProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                  <FaChartLine className="fs-4" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-top">
                <div className="row text-center small">
                  <div className="col-6 border-end">
                    <div className="text-muted mb-1">مبيعات</div>
                    <div className="fw-bold text-dark">{formatCurrency(totalStockOutValue, currency)}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted mb-1">تكلفة</div>
                    <div className="fw-bold text-danger">-{formatCurrency(totalStockOutCost, currency)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 d-flex align-items-stretch">

        {/* Quick Stats Grid & Actions */}
        <div className="col-lg-8">

          {/* Quick Actions */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0 py-3">
              <h5 className="h6 fw-bold mb-0 text-dark">إجراءات سريعة</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <a href="/stock-in" className="btn btn-outline-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 gap-2 border-dashed">
                    <MdArrowDownward className="fs-3" />
                    <span className="small fw-bold">استلام جديد</span>
                  </a>
                </div>
                <div className="col-6 col-md-3">
                  <a href="/stock-out" className="btn btn-outline-danger w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 gap-2 border-dashed">
                    <MdArrowUpward className="fs-3" />
                    <span className="small fw-bold">إخراج/بيع</span>
                  </a>
                </div>
                <div className="col-6 col-md-3">
                  <a href="/add" className="btn btn-outline-success w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 gap-2 border-dashed">
                    <FaBoxOpen className="fs-3" />
                    <span className="small fw-bold">منتج جديد</span>
                  </a>
                </div>
                <div className="col-6 col-md-3">
                  <a href="/transactions" className="btn btn-outline-secondary w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 gap-2 border-dashed">
                    <FaChartLine className="fs-3" />
                    <span className="small fw-bold">التقارير</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Movement Stats */}
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="h6 fw-bold mb-0">حركة المخزون</h5>
                <span className="badge bg-secondary">الإجمالي</span>
              </div>
              <div className="row text-center">
                <div className="col-6">
                  <div className="py-3 rounded bg-white border">
                    <h3 className="fw-bold text-success mb-1">{stockInTransactions.length}</h3>
                    <div className="small text-muted">عملية استلام</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="py-3 rounded bg-white border">
                    <h3 className="fw-bold text-danger mb-1">{stockOutTransactions.length}</h3>
                    <div className="small text-muted">عملية صرف</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Recent Transactions List */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="h6 fw-bold mb-0 text-dark">أحدث المعاملات</h5>
              <a href="/transactions" className="small text-primary text-decoration-none">عرض الكل</a>
            </div>
            <div className="list-group list-group-flush">
              {recentTransactions.length > 0 ? (
                recentTransactions.map(tx => {
                  const isStockIn = tx.type === TRANSACTION_TYPES.STOCK_IN;
                  const txDate = tx.createdAt?.seconds
                    ? new Date(tx.createdAt.seconds * 1000)
                    : new Date(tx.createdAt);

                  return (
                    <div key={tx.id} className="list-group-item px-3 py-3 border-bottom-0 border-top bg-transparent">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${isStockIn ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{ width: '35px', height: '35px' }}>
                            {isStockIn ? <MdArrowDownward /> : <MdArrowUpward />}
                          </div>
                          <div>
                            <div className="fw-bold fs-6 text-dark" style={{ fontSize: '0.9rem' }}>
                              {isStockIn ? 'استلام مخزون' : 'بيــع / إخراج'}
                            </div>
                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                              #{tx.displayId || tx.id.slice(0, 6)}
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className={`fw-bold small ${isStockIn ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(fromCents(isStockIn ? tx.totalCostCents : tx.totalPriceCents), currency)}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {txDate.toLocaleDateString('ar-LY')}
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted ps-5">
                        {isStockIn ? (
                          <span>المورد: {tx.supplierName || 'غير محدد'}</span>
                        ) : (
                          <span>العميل: {tx.customerName || 'نقدي'}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-5 text-muted">
                  <p className="mb-0">لا توجد معاملات حديثة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
