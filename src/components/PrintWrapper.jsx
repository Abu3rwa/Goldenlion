import React from 'react';
import ReactDOM from 'react-dom';

const PrintWrapper = ({ children }) => {
    const printRoot = document.getElementById('print-root');
    if (!printRoot) return null;

    return ReactDOM.createPortal(
        <div className="print-content">
            {children}
        </div>,
        printRoot
    );
};

export default PrintWrapper;
