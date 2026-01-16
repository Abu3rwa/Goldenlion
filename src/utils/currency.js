export const formatCurrency = (amount, currency) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return `${currency || ''} 0.00`;
    }
    return `${currency || ''} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  