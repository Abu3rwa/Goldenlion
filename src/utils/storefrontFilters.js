import { normalizeColorKey } from './cartUtils';

export const STORE_SORT_OPTIONS = [
    { value: 'default', label: 'الترتيب الافتراضي' },
    { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
    { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
    { value: 'newest', label: 'الأحدث' },
    { value: 'featured', label: 'المميزة أولاً' },
];

export const DEFAULT_STOREFRONT_FILTERS = {
    search: '',
    category: '',
    featured: false,
    inStock: true,
    hasDelivery: false,
    minPrice: '',
    maxPrice: '',
    color: '',
    sort: 'default',
};

const toBoolean = (value, defaultValue = false) => {
    if (value == null || value === '') return defaultValue;
    return value === '1' || value === 'true';
};

const toPositiveNumber = (value) => {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const parseStorefrontFilters = (searchParams) => {
    const valueFor = (key) => searchParams.get(key);

    const sort = valueFor('sort');
    const parsed = {
        search: (valueFor('q') || '').trim(),
        category: (valueFor('category') || '').trim(),
        featured: toBoolean(valueFor('featured'), false),
        inStock: toBoolean(valueFor('inStock'), true),
        hasDelivery: toBoolean(valueFor('hasDelivery'), false),
        minPrice: valueFor('minPrice') || '',
        maxPrice: valueFor('maxPrice') || '',
        color: (valueFor('color') || '').trim(),
        sort: STORE_SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'default',
    };

    return parsed;
};

export const buildStorefrontSearchParams = (filters) => {
    const params = new URLSearchParams();
    const safeFilters = { ...DEFAULT_STOREFRONT_FILTERS, ...filters };

    if (safeFilters.search) params.set('q', safeFilters.search);
    if (safeFilters.category) params.set('category', safeFilters.category);
    if (safeFilters.featured) params.set('featured', '1');
    if (!safeFilters.inStock) params.set('inStock', '0');
    if (safeFilters.hasDelivery) params.set('hasDelivery', '1');
    if (safeFilters.minPrice !== '' && safeFilters.minPrice != null) params.set('minPrice', `${safeFilters.minPrice}`);
    if (safeFilters.maxPrice !== '' && safeFilters.maxPrice != null) params.set('maxPrice', `${safeFilters.maxPrice}`);
    if (safeFilters.color) params.set('color', safeFilters.color);
    if (safeFilters.sort !== 'default') params.set('sort', safeFilters.sort);

    return params;
};

export const hasActiveStorefrontFilters = (filters) => {
    const safeFilters = { ...DEFAULT_STOREFRONT_FILTERS, ...filters };
    return (
        Boolean(safeFilters.search) ||
        Boolean(safeFilters.category) ||
        safeFilters.featured ||
        !safeFilters.inStock ||
        safeFilters.hasDelivery ||
        safeFilters.minPrice !== '' ||
        safeFilters.maxPrice !== '' ||
        Boolean(safeFilters.color) ||
        safeFilters.sort !== 'default'
    );
};

export const requiresClientSideFiltering = (filters) => {
    const safeFilters = { ...DEFAULT_STOREFRONT_FILTERS, ...filters };
    return Boolean(
        safeFilters.inStock ||
        safeFilters.search ||
        safeFilters.color ||
        safeFilters.minPrice !== '' ||
        safeFilters.maxPrice !== ''
    );
};

export const applyStorefrontFilters = (products, filters) => {
    const safeFilters = { ...DEFAULT_STOREFRONT_FILTERS, ...filters };
    const searchTerm = safeFilters.search.toLowerCase().trim();
    const selectedColorKey = normalizeColorKey(safeFilters.color);
    const minPrice = toPositiveNumber(safeFilters.minPrice);
    const maxPrice = toPositiveNumber(safeFilters.maxPrice);

    return products.filter((product) => {
        if (safeFilters.category && product.categoryId !== safeFilters.category) return false;
        if (safeFilters.featured && !product.featured) return false;
        if (safeFilters.inStock && !product.inStock) return false;
        if (safeFilters.hasDelivery && !product.hasDelivery) return false;

        if (minPrice != null && Number(product.price || 0) < minPrice) return false;
        if (maxPrice != null && Number(product.price || 0) > maxPrice) return false;

        if (selectedColorKey) {
            const matchesColor = (product.colorVariants || []).some((variant) => {
                const variantColorKey = normalizeColorKey(variant.colorKey || variant.color);
                return variantColorKey === selectedColorKey && Number(variant.quantity || 0) > 0;
            });
            if (!matchesColor) return false;
        }

        if (searchTerm) {
            const haystack = [
                product.name,
                product.nameEn,
                product.description,
                product.categoryName,
                ...(product.colorVariants || []).map((variant) => variant.color),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (!haystack.includes(searchTerm)) return false;
        }

        return true;
    });
};

export const sortStorefrontProducts = (products, sort) => {
    const sorted = [...products];

    switch (sort) {
        case 'price_asc':
            sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
            break;
        case 'price_desc':
            sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
            break;
        case 'newest':
            sorted.sort((a, b) => {
                const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bDate - aDate;
            });
            break;
        case 'featured':
            sorted.sort((a, b) => {
                if (Boolean(a.featured) !== Boolean(b.featured)) {
                    return a.featured ? -1 : 1;
                }
                if (Number(a.sortOrder || 0) !== Number(b.sortOrder || 0)) {
                    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
                }
                return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'ar');
            });
            break;
        case 'default':
        default:
            sorted.sort((a, b) => {
                if (Number(a.sortOrder || 0) !== Number(b.sortOrder || 0)) {
                    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
                }
                return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'ar');
            });
            break;
    }

    return sorted;
};

export const buildColorOptions = (products) => {
    const seen = new Map();

    products.forEach((product) => {
        (product.colorVariants || []).forEach((variant) => {
            const key = normalizeColorKey(variant.colorKey || variant.color);
            if (!key) return;
            if (!seen.has(key)) {
                seen.set(key, {
                    key,
                    label: variant.color,
                    colorCode: variant.colorCode || '#000000',
                });
            }
        });
    });

    return [...seen.values()].sort((a, b) => `${a.label}`.localeCompare(`${b.label}`, 'ar'));
};

export const buildCategoryCounts = (products) => {
    const counts = products.reduce((acc, product) => {
        if (!product.categoryId) return acc;
        acc[product.categoryId] = (acc[product.categoryId] || 0) + 1;
        return acc;
    }, {});
    return counts;
};
