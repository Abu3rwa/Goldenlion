import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNewProduct, updateExistingProduct } from '../store/productsSlice';
import { fetchSuppliers } from '../store/suppliersSlice';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductForm.css';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const productToEdit = useSelector((state) => 
    id ? state.products.products.find(p => p.id === id) : null
  );

  const { suppliers } = useSelector((state) => state.suppliers);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [addRequestStatus, setAddRequestStatus] = useState('idle');

  useEffect(() => {
    dispatch(fetchSuppliers());
  }, [dispatch]);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setQuantity(productToEdit.quantity);
      setPrice(productToEdit.price);
      setCostPrice(productToEdit.costPrice || '');
      setSupplierId(productToEdit.supplierId || '');
    }
  }, [productToEdit]);

  const canSave = [name, quantity, price, costPrice].every(Boolean) && addRequestStatus === 'idle';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (canSave) {
      try {
        setAddRequestStatus('pending');
        const productData = {
          name, 
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
          await dispatch(addNewProduct(productData)).unwrap();
        }
        setName('');
        setQuantity('');
        setPrice('');
        setCostPrice('');
        setSupplierId('');
        navigate('/');
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
      <div>
        <label>الاسم</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label>المورد</label>
        <select 
          value={supplierId} 
          onChange={(e) => setSupplierId(e.target.value)}
          className="supplier-select"
        >
          <option value="">-- اختر مورد --</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>الكمية</label>

        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div>
        <label>سعر التكلفة (رأس المال)</label>
        <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
      </div>
      <div>
        <label>سعر البيع</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <button type="submit" disabled={!canSave}>
        {addRequestStatus === 'pending' ? 'جاري الحفظ...' : 'حفظ'}
      </button>
    </form>
  );
};

export default ProductForm;
