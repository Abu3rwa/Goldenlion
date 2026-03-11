import { describe, expect, it } from 'vitest';
import {
    applyStorefrontFilters,
    buildStorefrontSearchParams,
    parseStorefrontFilters,
    requiresClientSideFiltering,
} from './storefrontFilters';

const sampleProducts = [
    {
        id: 'p-1',
        name: 'شنطة سوداء',
        categoryId: 'bags',
        featured: true,
        inStock: true,
        hasDelivery: true,
        price: 1000,
        colorVariants: [{ color: 'أسود', colorKey: 'اسود', quantity: 3 }],
    },
    {
        id: 'p-2',
        name: 'محفظة بنية',
        categoryId: 'wallets',
        featured: false,
        inStock: true,
        hasDelivery: false,
        price: 500,
        colorVariants: [{ color: 'بني', colorKey: 'بني', quantity: 1 }],
    },
    {
        id: 'p-3',
        name: 'شنطة حمراء',
        categoryId: 'bags',
        featured: false,
        inStock: false,
        hasDelivery: true,
        price: 2000,
        colorVariants: [{ color: 'أحمر', colorKey: 'احمر', quantity: 0 }],
    },
];

describe('storefrontFilters', () => {
    it('parses and serializes query params for category + flags', () => {
        const params = new URLSearchParams('q=bag&category=bags&featured=1&inStock=0&hasDelivery=1&sort=price_desc');
        const parsed = parseStorefrontFilters(params);

        expect(parsed.search).toBe('bag');
        expect(parsed.category).toBe('bags');
        expect(parsed.featured).toBe(true);
        expect(parsed.inStock).toBe(false);
        expect(parsed.hasDelivery).toBe(true);
        expect(parsed.sort).toBe('price_desc');

        const rebuilt = buildStorefrontSearchParams(parsed);
        expect(rebuilt.get('category')).toBe('bags');
        expect(rebuilt.get('featured')).toBe('1');
        expect(rebuilt.get('inStock')).toBe('0');
    });

    it('applies combined filters including category, stock, delivery, price and color', () => {
        const filtered = applyStorefrontFilters(sampleProducts, {
            category: 'bags',
            inStock: true,
            hasDelivery: true,
            minPrice: '900',
            maxPrice: '1500',
            color: 'اسود',
            featured: true,
            search: '',
        });

        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('p-1');
    });

    it('does not treat empty price filters as zero', () => {
        const filtered = applyStorefrontFilters(sampleProducts, {
            minPrice: '',
            maxPrice: '',
            inStock: true,
        });

        expect(filtered).toHaveLength(2);
        expect(filtered.map((product) => product.id)).toEqual(['p-1', 'p-2']);
    });

    it('uses client-side filtering for the default in-stock storefront view', () => {
        expect(requiresClientSideFiltering({ inStock: true })).toBe(true);
        expect(requiresClientSideFiltering({ inStock: false })).toBe(false);
    });
});
