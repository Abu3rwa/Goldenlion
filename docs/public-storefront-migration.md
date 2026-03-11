# Public Storefront Migration Notes

## New/updated Firestore fields

### `publicProducts`
- `categoryId` (string, required for new/updated products)
- `categoryName` (string, denormalized label)
- `colorVariants[].colorKey` (normalized lowercase color key)
- `totalStock` (number, derived from variants when variants exist)
- `hasDelivery` (boolean, default `true`)

### `publicCategories`
- `name` (string)
- `slug` (string)
- `lookupKey` (string, normalized lowercase name)
- `active` (boolean)
- `sortOrder` (number)
- `productCount` (number, synced from `publicProducts`)
- `inStockCount` (number, synced from `publicProducts`)

### `publicOrders`
- `coupon` (object|null)
  - `code`
  - `status` (`pending_validation`)
  - `discountAmount`
  - `discountType`
  - `message`
- `items[].selectedColor.colorKey` (for deterministic variant stock mapping)

## Indexes

Added composite indexes in `firestore.indexes.json` for `publicProducts` queries used by storefront sorting:
- by `sortOrder` + `name`
- by `price` ascending/descending + `name`
- by `createdAt` + `name`
- by `featured` + `sortOrder` + `name`

These indexes are scoped with `inStock` and `categoryId` to support common filter combinations.
