import React, { useState, useEffect } from 'react';
import { companyService } from '../services/companyService';
import {
    MdSave, MdLocationOn, MdAccessTime, MdPhone, MdInfo,
    MdAdd, MdDelete, MdQuestionAnswer, MdLocalShipping,
    MdPayment, MdAssignmentReturn, MdSmartToy
} from 'react-icons/md';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import './ChatbotInfoForm.css';

const ChatbotInfoForm = () => {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    // Location
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');

    // Working Hours
    const [weekdays, setWeekdays] = useState('');
    const [friday, setFriday] = useState('');
    const [saturday, setSaturday] = useState('');
    const [hoursNotes, setHoursNotes] = useState('');

    // Contact
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [instagram, setInstagram] = useState('');
    const [facebook, setFacebook] = useState('');

    // Business Info
    const [aboutUs, setAboutUs] = useState('');
    const [delivery, setDelivery] = useState('');
    const [payment, setPayment] = useState('');
    const [returnPolicy, setReturnPolicy] = useState('');

    // Custom FAQs
    const [customFaqs, setCustomFaqs] = useState([]);

    useEffect(() => {
        companyService.getChatbotInfo().then((data) => {
            if (data) {
                // Location
                setAddress(data.location?.address || '');
                setCity(data.location?.city || '');
                setGoogleMapsUrl(data.location?.googleMapsUrl || '');
                // Working Hours
                setWeekdays(data.workingHours?.weekdays || '');
                setFriday(data.workingHours?.friday || '');
                setSaturday(data.workingHours?.saturday || '');
                setHoursNotes(data.workingHours?.notes || '');
                // Contact
                setPhone(data.contact?.phone || '');
                setWhatsapp(data.contact?.whatsapp || '');
                setEmail(data.contact?.email || '');
                setInstagram(data.contact?.instagram || '');
                setFacebook(data.contact?.facebook || '');
                // Business Info
                setAboutUs(data.aboutUs || '');
                setDelivery(data.delivery || '');
                setPayment(data.payment || '');
                setReturnPolicy(data.returnPolicy || '');
                // FAQs
                setCustomFaqs(Array.isArray(data.customFaqs) ? data.customFaqs : []);
            }
            setLoading(false);
        });
    }, []);

    const handleAddFaq = () => {
        setCustomFaqs((prev) => [...prev, { question: '', answer: '' }]);
    };

    const handleRemoveFaq = (index) => {
        setCustomFaqs((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFaqChange = (index, field, value) => {
        setCustomFaqs((prev) =>
            prev.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq))
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        const data = {
            location: { address, city, googleMapsUrl },
            workingHours: { weekdays, friday, saturday, notes: hoursNotes },
            contact: { phone, whatsapp, email, instagram, facebook },
            aboutUs,
            delivery,
            payment,
            returnPolicy,
            customFaqs: customFaqs.filter((faq) => faq.question.trim() || faq.answer.trim()),
        };

        try {
            await companyService.saveChatbotInfo(data);
            setMessage('تم حفظ معلومات الشات بوت بنجاح ✅');
            setMessageType('success');
        } catch (error) {
            console.error('Failed to save chatbot info:', error);
            setMessage('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
            setMessageType('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(''), 4000);
        }
    };

    if (loading) {
        return (
            <div className="chatbot-info-loading">
                <div className="spinner"></div>
                <p>جاري تحميل المعلومات...</p>
            </div>
        );
    }

    return (
        <div className="chatbot-info-form">
            <div className="chatbot-info-header">
                <MdSmartToy className="header-icon" />
                <div>
                    <h4>معلومات الشات بوت</h4>
                    <p className="header-subtitle">
                        هذه المعلومات سيستخدمها الشات بوت للرد على أسئلة الزبائن حول الموقع، ساعات العمل، طرق التواصل، وغيرها.
                    </p>
                </div>
            </div>

            {message && (
                <div className={`chatbot-alert ${messageType}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* ── Location Section ── */}
                <div className="chatbot-section">
                    <h5 className="section-title">
                        <MdLocationOn className="section-icon" /> الموقع والعنوان
                    </h5>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>العنوان الكامل</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="مثال: طرابلس - حي الأندلس - شارع الجمهورية"
                            />
                        </div>
                        <div className="form-field">
                            <label>المدينة</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="مثال: طرابلس"
                            />
                        </div>
                        <div className="form-field full-width">
                            <label>رابط خرائط قوقل</label>
                            <input
                                type="url"
                                value={googleMapsUrl}
                                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                placeholder="https://maps.google.com/..."
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Working Hours Section ── */}
                <div className="chatbot-section">
                    <h5 className="section-title">
                        <MdAccessTime className="section-icon" /> ساعات العمل
                    </h5>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>أيام الأسبوع (الأحد - الخميس)</label>
                            <input
                                type="text"
                                value={weekdays}
                                onChange={(e) => setWeekdays(e.target.value)}
                                placeholder="مثال: 9:00 ص - 10:00 م"
                            />
                        </div>
                        <div className="form-field">
                            <label>الجمعة</label>
                            <input
                                type="text"
                                value={friday}
                                onChange={(e) => setFriday(e.target.value)}
                                placeholder="مثال: 2:00 م - 10:00 م"
                            />
                        </div>
                        <div className="form-field">
                            <label>السبت</label>
                            <input
                                type="text"
                                value={saturday}
                                onChange={(e) => setSaturday(e.target.value)}
                                placeholder="مثال: مغلق"
                            />
                        </div>
                        <div className="form-field">
                            <label>ملاحظات إضافية</label>
                            <input
                                type="text"
                                value={hoursNotes}
                                onChange={(e) => setHoursNotes(e.target.value)}
                                placeholder="مثال: خلال رمضان الساعات تتغير"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Contact Section ── */}
                <div className="chatbot-section">
                    <h5 className="section-title">
                        <MdPhone className="section-icon" /> معلومات التواصل
                    </h5>
                    <div className="form-grid">
                        <div className="form-field">
                            <label><MdPhone className="field-icon" /> رقم الهاتف</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="091-1234567"
                            />
                        </div>
                        <div className="form-field">
                            <label><FaWhatsapp className="field-icon whatsapp" /> واتساب</label>
                            <input
                                type="text"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="091-1234567"
                            />
                        </div>
                        <div className="form-field">
                            <label>📧 البريد الإلكتروني</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="info@goldenlion.ly"
                                dir="ltr"
                            />
                        </div>
                        <div className="form-field">
                            <label><FaInstagram className="field-icon instagram" /> انستقرام</label>
                            <input
                                type="text"
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="@goldenlion_ly"
                                dir="ltr"
                            />
                        </div>
                        <div className="form-field full-width">
                            <label><FaFacebook className="field-icon facebook" /> فيسبوك</label>
                            <input
                                type="text"
                                value={facebook}
                                onChange={(e) => setFacebook(e.target.value)}
                                placeholder="https://facebook.com/goldenlionly"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Business Info Section ── */}
                <div className="chatbot-section">
                    <h5 className="section-title">
                        <MdInfo className="section-icon" /> معلومات عامة
                    </h5>
                    <div className="form-grid">
                        <div className="form-field full-width">
                            <label>نبذة عن المتجر (من نحن)</label>
                            <textarea
                                rows="3"
                                value={aboutUs}
                                onChange={(e) => setAboutUs(e.target.value)}
                                placeholder="مثال: مجمـوعة الأسـد متجر متخصص في بيع الحقائب والإكسسوارات الفاخرة في ليبيا."
                            />
                        </div>
                        <div className="form-field full-width">
                            <label><MdLocalShipping className="field-icon" /> معلومات التوصيل</label>
                            <textarea
                                rows="2"
                                value={delivery}
                                onChange={(e) => setDelivery(e.target.value)}
                                placeholder="مثال: نوصّل لكل مدن ليبيا خلال 2-5 أيام عمل. التوصيل مجاني للطلبات فوق 200 دينار."
                            />
                        </div>
                        <div className="form-field full-width">
                            <label><MdPayment className="field-icon" /> طرق الدفع</label>
                            <textarea
                                rows="2"
                                value={payment}
                                onChange={(e) => setPayment(e.target.value)}
                                placeholder="مثال: نقبل الدفع عند الاستلام وتحويل بنكي."
                            />
                        </div>
                        <div className="form-field full-width">
                            <label><MdAssignmentReturn className="field-icon" /> سياسة الاسترجاع والاستبدال</label>
                            <textarea
                                rows="2"
                                value={returnPolicy}
                                onChange={(e) => setReturnPolicy(e.target.value)}
                                placeholder="مثال: يمكنك استرجاع أو استبدال المنتج خلال 7 أيام من الاستلام بشرط أن يكون بحالة جيدة."
                            />
                        </div>
                    </div>
                </div>

                {/* ── Custom FAQs Section ── */}
                <div className="chatbot-section">
                    <h5 className="section-title">
                        <MdQuestionAnswer className="section-icon" /> أسئلة وأجوبة مخصصة
                    </h5>
                    <p className="section-description">
                        أضف أسئلة يسألها الزبائن كثيراً وأجوبتها. الشات بوت سيستخدم هذه الأجوبة مباشرة.
                    </p>

                    {customFaqs.map((faq, index) => (
                        <div key={index} className="faq-item">
                            <div className="faq-header">
                                <span className="faq-number">سؤال {index + 1}</span>
                                <button
                                    type="button"
                                    className="btn-remove-faq"
                                    onClick={() => handleRemoveFaq(index)}
                                    title="حذف السؤال"
                                >
                                    <MdDelete />
                                </button>
                            </div>
                            <div className="form-field">
                                <label>السؤال</label>
                                <input
                                    type="text"
                                    value={faq.question}
                                    onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                    placeholder="مثال: هل عندكم توصيل؟"
                                />
                            </div>
                            <div className="form-field">
                                <label>الجواب</label>
                                <textarea
                                    rows="2"
                                    value={faq.answer}
                                    onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                    placeholder="مثال: نعم نوصّل لكل مدن ليبيا خلال 2-5 أيام عمل."
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        className="btn-add-faq"
                        onClick={handleAddFaq}
                    >
                        <MdAdd /> إضافة سؤال جديد
                    </button>
                </div>

                {/* ── Submit ── */}
                <div className="chatbot-submit">
                    <button
                        type="submit"
                        className="btn-save"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <span className="save-spinner"></span> جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <MdSave /> حفظ معلومات الشات بوت
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatbotInfoForm;
