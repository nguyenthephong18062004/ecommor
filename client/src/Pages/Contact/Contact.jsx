import classNames from 'classnames/bind';
import { Mail, MapPin, Phone } from 'lucide-react';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import SocialLinks from '../../Components/SocialLinks/SocialLinks';
import { contactAddress, contactEmail, contactMapUrl, contactPhone } from '../../config/contactInfo';
import styles from './Contact.module.scss';

const cx = classNames.bind(styles);

function Contact() {
    return (
        <div className={cx('wrapper')}>
            <Header />
            <main className={cx('main')}>
                <h1>Liên hệ</h1>
                <div className={cx('details')}>
                    <section className={cx('location')}>
                        <h2>Địa chỉ cửa hàng</h2>
                        <div className={cx('address')}><MapPin size={21} /><span>{contactAddress}</span></div>
                        <a className={cx('map-link')} href={contactMapUrl} target="_blank" rel="noopener noreferrer"
                            aria-label="Xem địa chỉ cửa hàng trên Google Maps" title="Xem trên Google Maps">
                            <iframe
                                src={`https://www.google.com/maps?q=${encodeURIComponent(contactAddress)}&z=16&output=embed`}
                                title="Bản đồ địa chỉ cửa hàng"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                tabIndex={-1}
                            />
                        </a>
                    </section>
                    <section className={cx('direct')}>
                        <h2>Liên hệ trực tiếp</h2>
                        <div className={cx('detail-row')}>
                            <Phone size={21} />
                            <div><span>Hotline</span>{contactPhone
                                ? <a href={`tel:${contactPhone.replace(/\s/g, '')}`}>{contactPhone}</a>
                                : <span>0382459723</span>}</div>
                        </div>
                        <div className={cx('detail-row')}>
                            <Mail size={21} />
                            <div><span>Email</span>{contactEmail
                                ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                                : <span>watchpremium@gmail.com</span>}</div>
                        </div>
                    </section>
                </div>
                <section className={cx('social-section')}>
                    <h2>Kết nối qua mạng xã hội</h2>
                    <SocialLinks />
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default Contact;
