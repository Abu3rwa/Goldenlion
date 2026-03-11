import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import Header from './Header';

vi.mock('../services/userService', () => ({
    userService: {
        canPerformAction: vi.fn(() => false),
    },
}));

vi.mock('../services/transactionService', () => ({
    transactionService: {
        getTransactions: vi.fn(),
    },
}));

const createStore = () => configureStore({
    reducer: {
        auth: (state = { user: null, userProfile: null }) => state,
        company: (state = { companyName: 'مجمـوعة الأسـد', companyNameEn: 'Golden Lion' }) => state,
    },
});

describe('Header public navigation', () => {
    it('shows the public header on the landing page for anonymous visitors', () => {
        const store = createStore();

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/']}>
                    <Header />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getAllByRole('link', { name: /الرئيسية/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /منتجات/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /login/i }).length).toBeGreaterThan(0);
    }, 15000);
});
