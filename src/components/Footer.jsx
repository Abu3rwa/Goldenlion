import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    MdArrowOutward,
    MdCall,
    MdLocationOn,
    MdOutlineSchedule,
    MdStorefront,
} from 'react-icons/md';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { companyService } from '../services/companyService';
import './Footer.css';

const defaultBusinessInfo = {
    location: { address: '', city: '', googleMapsUrl: '' },
    workingHours: { weekdays: '', friday: '', saturday: '', notes: '' },
    contact: { phone: '', whatsapp: '', email: '', instagram: '', facebook: '' },
    aboutUs: '',
    delivery: '',
};

const sanitizePhone = (value) => `${value || ''}`.replace(/\D/g, '');

const Footer = () => {
    const {
        companyName,
        companyNameEn,
        address,
        phone,
        terms,
    } = useSelector((state) => state.company);
    const [businessInfo, setBusinessInfo] = useState(defaultBusinessInfo);

    useEffect(() => {
        let isMounted = true;

        companyService.getChatbotInfo()
            .then((data) => {
                if (isMounted) {
                    setBusinessInfo({ ...defaultBusinessInfo, ...data });
                }
            })
            .catch(() => {
                if (isMounted) {
                    setBusinessInfo(defaultBusinessInfo);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const displayName = companyName || 'مجمـوعة الأسـد';
    const displayAddress = businessInfo.location?.address || address || 'طرابلس، ليبيا';
    const phoneValue = businessInfo.contact?.phone || businessInfo.contact?.whatsapp || phone || '';
    const whatsappValue = businessInfo.contact?.whatsapp || phone || '';
    const aboutText = businessInfo.aboutUs || 'متجر متخصص في الشنط والمحافظ المختارة بعناية مع توصيل منظم داخل ليبيا وتجربة شراء واضحة وسريعة.';
    const deliveryText = businessInfo.delivery || 'توصيل إلى المدن المتاحة مع متابعة دقيقة للطلب وتأكيد سريع عبر واتساب.';
    const workingHours = businessInfo.workingHours || defaultBusinessInfo.workingHours;

    const quickLinks = useMemo(() => ([
        { label: 'الرئيسية', to: '/' },
        { label: 'المتجر', to: '/store' },
        { label: 'إتمام الطلب', to: '/checkout' },
        { label: 'تسجيل الدخول', to: '/login' },
    ]), []);

    const socialLinks = [
        {
            href: businessInfo.contact?.instagram || '',
            label: 'Instagram',
            icon: <FaInstagram />,
        },
        {
            href: businessInfo.contact?.facebook || '',
            label: 'Facebook',
            icon: <FaFacebookF />,
        },
        {
            href: whatsappValue ? `https://wa.me/${sanitizePhone(whatsappValue)}` : '',
            label: 'WhatsApp',
            icon: <FaWhatsapp />,
        },
    ].filter((item) => item.href);

    return (
        <footer className="site-footer">
            <div className="site-footer-shell">
                <section className="footer-cta">
                    <div className="footer-cta-copy">
                        <span className="footer-kicker">Golden Lion Storefront</span>
                        <h2>جاهز تطلب؟ افتح المتجر واختر طلبك في دقائق.</h2>
                        <p>
                            تجربة شراء مباشرة، تفاصيل واضحة، وتواصل سريع إذا احتجت تأكيد أو استفسار.
                        </p>
                    </div>
                    <div className="footer-cta-actions">
                        <Link to="/store" className="footer-primary-link">
                            <MdStorefront />
                            تصفح المنتجات
                        </Link>
                        {whatsappValue ? (
                            <a
                                href={`https://wa.me/${sanitizePhone(whatsappValue)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer-secondary-link"
                            >
                                <FaWhatsapp />
                                واتساب مباشر
                            </a>
                        ) : null}
                    </div>
                </section>

                <div className="footer-grid">
                    <section className="footer-panel footer-brand-panel">
                        <span className="footer-brand-mark">GL</span>
                        <div>
                            <h3>{displayName}</h3>
                            {companyNameEn ? <p className="footer-brand-en">{companyNameEn}</p> : null}
                        </div>
                        <p className="footer-brand-copy">{aboutText}</p>
                        <p className="footer-brand-copy footer-brand-copy-muted">{deliveryText}</p>
                    </section>

                    <section className="footer-panel">
                        <h4>روابط سريعة</h4>
                        <nav className="footer-link-list" aria-label="روابط التذييل">
                            {quickLinks.map((link) => (
                                <Link key={link.to} to={link.to} className="footer-text-link">
                                    <span>{link.label}</span>
                                    <MdArrowOutward />
                                </Link>
                            ))}
                        </nav>
                    </section>

                    <section className="footer-panel">
                        <h4>التواصل</h4>
                        <div className="footer-contact-list">
                            <div className="footer-contact-item">
                                <MdLocationOn />
                                <span>{displayAddress}</span>
                            </div>
                            {phoneValue ? (
                                <a href={`tel:${sanitizePhone(phoneValue)}`} className="footer-contact-item footer-contact-link">
                                    <MdCall />
                                    <span dir="ltr">{phoneValue}</span>
                                </a>
                            ) : null}
                            {businessInfo.contact?.email ? (
                                <a href={`mailto:${businessInfo.contact.email}`} className="footer-contact-item footer-contact-link">
                                    <MdArrowOutward />
                                    <span dir="ltr">{businessInfo.contact.email}</span>
                                </a>
                            ) : null}
                        </div>
                        {socialLinks.length > 0 ? (
                            <div className="footer-socials">
                                {socialLinks.map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="footer-social-link"
                                        aria-label={item.label}
                                    >
                                        {item.icon}
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </section>

                    <section className="footer-panel">
                        <h4>معلومات المتجر</h4>
                        <div className="footer-meta-stack">
                            <div className="footer-meta-card">
                                <MdOutlineSchedule />
                                <div>
                                    <strong>أوقات العمل</strong>
                                    <span>{workingHours.weekdays || 'يومياً حسب التوفر والتأكيد الهاتفي'}</span>
                                </div>
                            </div>
                            {workingHours.friday ? (
                                <div className="footer-meta-note">الجمعة: {workingHours.friday}</div>
                            ) : null}
                            {workingHours.saturday ? (
                                <div className="footer-meta-note">السبت: {workingHours.saturday}</div>
                            ) : null}
                            {workingHours.notes ? (
                                <div className="footer-meta-note">{workingHours.notes}</div>
                            ) : null}
                            {terms ? (
                                <div className="footer-meta-note">{terms}</div>
                            ) : null}
                        </div>
                    </section>
                </div>

                <div className="footer-bottom-bar">
                    <span>© {new Date().getFullYear()} {displayName}. جميع الحقوق محفوظة.</span>
                    <span>واجهة متجر مصممة للطلب السريع، المتابعة الواضحة، وتجربة موبايل مستقرة.</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
