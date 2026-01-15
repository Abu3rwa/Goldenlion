# Business Requirements Document (BRD)
**Project Name:** Golden Lion Inventory Management System (IMS)  
**Date:** January 15, 2026  
**Version:** 1.0  
**Status:** Draft  

---

## 1. Executive Summary
The "Golden Lion" IMS is a web-based application designed to provide absolute accuracy and financial transparency for retail inventory management. Built on **React** and **Firebase**, the system aims to solve the store owner's critical pain points: lack of visibility into capital tied up in stock, inability to track supplier performance, and stock discrepancies. The system prioritizes data integrity ("إملاء"), automated safeguards, and a bilingual (Arabic/English) user experience.

## 2. Business Objectives & Goals

### 2.1 Capital Transparency (Cost vs. Revenue)
**Goal:** The owner must know the exact monetary value of the inventory at any given second.
*   **Requirement:** System must calculate and display:
    *   **Total Cost Value (Capital):** $\sum (Quantity \times Cost\_Price)$
    *   **Total Retail Value (Revenue):** $\sum (Quantity \times Selling\_Price)$
    *   **Potential Profit Margin:** Total Retail Value - Total Cost Value.
*   **Success Metric:** Dashboard updates in real-time ($< 2$ seconds) after any stock change.

### 2.2 Supplier Accountability
**Goal:** Every item must be traceable to its source to handle returns, reorders, and quality issues.
*   **Requirement:** 
    *   Mandatory "Supplier" field for every product entry.
    *   Ability to filter inventory by Supplier.
    *   View total capital invested per Supplier.
*   **Success Metric:** 100% of SKUs have an assigned active supplier.

### 2.3 Stock Integrity & Accuracy
**Goal:** Prevent "dead stock" and "stockouts" while ensuring digital records match physical reality.
*   **Requirement:**
    *   Automated Low Stock Alerts based on customizable thresholds.
    *   Prevention of negative stock entries (unless explicitly authorized as "backorder").
    *   Periodic "Stock Take" mode to reconcile physical counts with digital records.
*   **Success Metric:** Reduction of stock discrepancies to < 0.5%.

### 2.4 Comprehensive Audit Trail (PRIORITY: CRITICAL / P0)
**Goal:** Total traceability of every action to prevent theft and mismanagement. This is the "Black Box" of the business.
*   **Requirement:**
    *   **Immutable Ledger:** An append-only log of every transaction: Sale, Restock, Return, Damaged Goods, Price Adjustment, Supplier Change.
    *   **The "Who, What, When, From-To":**
        *   **Who:** User ID and Name.
        *   **When:** Exact Server Timestamp.
        *   **What:** The specific field changed (e.g., "Quantity", "Cost Price").
        *   **Delta Tracking:** MUST record the **Previous Value** and the **New Value** (e.g., "Qty changed from 50 to 45").
    *   **Search & Filter:** Owner must be able to filter logs by User, Date Range, or specific Product.
*   **Success Metric:** 100% of database write operations generate a corresponding audit log entry. Zero "ghost" changes.

---

## 3. Functional Requirements

### 3.1 User Authentication & Roles
*   **FR-AUTH-01:** Secure Email/Password Login (Firebase Auth).
*   **FR-AUTH-02:** Role-Based Access Control (RBAC):
    *   *Admin (Owner):* Full access to costs, supplier data, and audit logs.
    *   *Staff:* Access to stock adjustments and sales; restricted view of Cost Price (optional).

### 3.2 Inventory Management
*   **FR-INV-01:** Add/Edit Product with fields: Name, Barcode/SKU, Supplier (Dropdown), Cost Price, Selling Price, Quantity, Low Stock Threshold.
*   **FR-INV-02:** Real-time stock updates.
*   **FR-INV-03:** "Quick Add" feature for restocking existing items.

### 3.3 Supplier Management Module
*   **FR-SUP-01:** CRUD (Create, Read, Update, Delete) operations for Suppliers.
*   **FR-SUP-02:** Supplier details: Name, Contact Phone, Address.

### 3.4 Financial Dashboard
*   **FR-DASH-01:** Widget displaying **Total Capital Invested** (Cost Basis).
*   **FR-DASH-02:** Widget displaying **Total Inventory Value** (Retail Basis).
*   **FR-DASH-03:** Alert widget for "Low Stock" items.

### 3.5 Reporting & History
*   **FR-RPT-01:** Transaction History view (The Audit Trail).
*   **FR-RPT-02:** Export capability (CSV/PDF) for monthly closing.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Usability & Localization
*   **NFR-USE-01:** **Arabic First Interface**: The UI must fully support RTL (Right-to-Left) layout.
*   **NFR-USE-02:** **Typography**: Use **Tajwal** font for maximum legibility in Arabic.
*   **NFR-USE-03:** **Responsive Design**: Fully functional on Mobile (for walking around the store) and Tablet/Desktop (for back-office).

### 4.2 Data Integrity & Security
*   **NFR-SEC-01:** Firestore Security Rules to prevent unauthorized reads/writes.
*   **NFR-DAT-01:** **Floating Point Accuracy**: Financial calculations must handle decimals precisely (e.g., preventing $10.00 becoming $9.999999).

### 4.3 Performance
*   **NFR-PER-01:** Dashboard load time under 1.5 seconds on 4G networks.
*   **NFR-PER-02:** Offline support (Firebase persistence) to allow viewing data without internet.

---

## 5. Technical Stack Constraints
*   **Frontend:** React (Vite), Redux Toolkit (State Management).
*   **Backend / Database:** Firebase v9 (Firestore, Auth, Hosting).
*   **Styling:** CSS Variables for theming, Responsive Grid/Flexbox.

---

## 6. Glossary
*   **SKU:** Stock Keeping Unit (unique identifier for items).
*   **Cost Price (CP):** The price the owner pays to the supplier.
*   **Sales Price (SP):** The price the customer pays.
*   **Mored (مورد):** Arabic term for Supplier.
