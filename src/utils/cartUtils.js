export const normalizeColorKey = (value) => {
    if (!value) return '';
    return `${value}`.trim().toLowerCase();
};

export const hasColorVariants = (product) => {
    return Array.isArray(product?.colorVariants) && product.colorVariants.length > 0;
};

export const findVariantByColor = (product, selectedColor) => {
    if (!hasColorVariants(product)) return null;

    const selectedKey = normalizeColorKey(
        selectedColor?.colorKey || selectedColor?.color || selectedColor
    );
    if (!selectedKey) return null;

    return product.colorVariants.find((variant) => {
        const variantKey = normalizeColorKey(variant.colorKey || variant.color);
        return variantKey === selectedKey;
    }) || null;
};

export const buildCartKey = (productId, selectedColor = null) => {
    const colorKey = normalizeColorKey(
        selectedColor?.colorKey || selectedColor?.color || selectedColor
    );
    return colorKey ? `${productId}::${colorKey}` : `${productId}`;
};

export const getAvailableStockForSelection = (product, selectedColor = null) => {
    if (!product) return 0;

    if (hasColorVariants(product)) {
        const variant = findVariantByColor(product, selectedColor);
        return Math.max(0, Number(variant?.quantity || 0));
    }

    if (typeof product.totalStock === 'number') {
        if (product.totalStock > 0) {
            return Math.max(0, product.totalStock);
        }

        // Legacy public products may still be marked as in stock while totalStock remains zero.
        if (product.inStock) {
            return Number.POSITIVE_INFINITY;
        }

        return 0;
    }

    return product.inStock ? 1 : 0;
};

export const normalizeSelectedColor = (product, selectedColor = null) => {
    const variant = findVariantByColor(product, selectedColor);
    if (!variant) return null;

    return {
        color: variant.color,
        colorCode: variant.colorCode || '#000000',
        colorKey: normalizeColorKey(variant.colorKey || variant.color),
    };
};
