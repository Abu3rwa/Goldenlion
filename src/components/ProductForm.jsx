import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNewProduct, updateExistingProduct } from '../store/productsSlice';
import { fetchSuppliers } from '../store/suppliersSlice';
import { fetchCategories } from '../store/categoriesSlice';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import './ProductForm.css';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userProfile } = useSelector((state) => state.auth);

  const productToEdit = useSelector((state) =>
    id ? state.products.products.find(p => p.id === id) : null
  );

  const { suppliers } = useSelector((state) => state.suppliers);
  const { categories } = useSelector((state) => state.categories);
  const canManageInventory = userService.canPerformAction(userProfile?.roles || [], 'MANAGE_INVENTORY');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [addRequestStatus, setAddRequestStatus] = useState('idle');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (productToEdit) {
      setCode(productToEdit.code || '');
      setName(productToEdit.name);
      setQuantity(productToEdit.quantity);
      setPrice(productToEdit.price);
      setCostPrice(productToEdit.costPrice || '');
      setSupplierId(productToEdit.supplierId || '');

      // Handle Category logic
      if (productToEdit.categoryId) {
        setCategoryId(productToEdit.categoryId);
      } else if (productToEdit.category) {
        // Attempt to map legacy string category to ID
        const matchingCat = categories.find(c => c.name === productToEdit.category);
        if (matchingCat) setCategoryId(matchingCat.id);
      }
    }
  }, [productToEdit, categories]);

const valuesOfForm = [name, quantity, price, costPrice, supplierId, categoryId];
  const canSave = valuesOfForm.every(Boolean) && addRequestStatus === 'idle';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (canSave) {
      try {
        setAddRequestStatus('pending');
        const productData = {
          code,
          name,
          categoryId, // Save the ID
          quantity: parseInt(quantity),
          price: parseFloat(price),
          costPrice: parseFloat(costPrice),
          supplierId
        };

        if (id) {
          await dispatch(updateExistingProduct({
            id,
            ...productData
          })).unwrap();
        } else {
          if(price<costPrice){
            alert('سعر البيع لا يمكن أن يكون أقل من سعر التكلفة!');
            setAddRequestStatus('idle');
            return;
          }
          await dispatch(addNewProduct(productData)).unwrap();
          setSaved('تم إضافة المنتج بنجاح!');
        }
        setName('');
        setCategoryId('');
        setQuantity('');
        setPrice('');
        setCostPrice('');
        setSupplierId('');
          setTimeout(() => setSaved(''), 2000);
       } catch (err) {
        console.error('Failed to save the product: ', err);
      } finally {
        setAddRequestStatus('idle');
      }
    }
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h2>{id ? 'تعديل المنتج' : 'إضافة منتج'}</h2>
      <div className="row g-3 mb-1">
        <div className="col-md-4">
          <label>كود المنتج</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!canManageInventory}
            placeholder="مثال: BAG-001"
            dir="ltr"
          />
        </div>
        <div className="col-md-8">
          <label>الاسم</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!canManageInventory} />
        </div>
      </div>

      <div className="category-supplier-row"> 
<div>
         <div className="d-flex gap-2 m-2">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!canManageInventory}
            className="flex-grow-1"
          >
            <option value=""> اختر التصنيف </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

        </div>
      </div>

      <div >
         <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="supplier-select"
          disabled={!canManageInventory}
        >
          <option value=""> اختر مورد </option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      </div>
      <div className="mb-3 money-row">

         <div>
 
        <input placeholder='الكمية' type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={!canManageInventory} />
      </div>
      <div>
         <input placeholder=' سعر التكلفة (رأس المال)' type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} disabled={!canManageInventory} />
      </div>
      <div>
         <input placeholder='سعر البيع' type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!canManageInventory} />
      </div>
      
      </div>
     <h3 className='saved-message'>{saved}</h3>
      {canManageInventory && (
        <button type="submit" disabled={!canSave}>
          {addRequestStatus === 'pending' ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      )}
      {!canManageInventory && (
        <p className="view-only-msg">لديك صلاحية العرض فقط. لا يمكنك التعديل أو الحفظ.</p>
      )}
    </form>
  );
};

export default ProductForm;
