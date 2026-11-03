import classNames from 'classnames/bind';
import styles from './Footer.module.scss';
import { Link } from 'react-router-dom';
import { contactAddress, contactEmail, contactMapUrl, contactPhone } from '../../config/contactInfo';
import SocialLinks from '../SocialLinks/SocialLinks';
import { policies } from '../../config/policies';

const cx = classNames.bind(styles);

function Footer() {
    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('column')}>
                    <h3 className={cx('title')}>ĐỒNG HỒ ECOMMOR</h3>
                    <p className={cx('description')}>
                        Khám phá đồng hồ theo thương hiệu, phong cách và ngân sách. Xem thông số, tình trạng và thông tin bảo hành của từng sản phẩm trước khi mua.
                    </p>
                </div>

                <div className={cx('column')}>
                    <h3 className={cx('title')}>CHÍNH SÁCH</h3>
                    <ul className={cx('service-list')}>
                        {Object.entries(policies).map(([slug, policy]) => <li key={slug}><Link to={`/chinh-sach/${slug}`}>{policy.title}</Link></li>)}
                    </ul>
                </div>

                <div className={cx('column')}>
                    <h3 className={cx('title')}>LIÊN HỆ</h3>
                    <div className={cx('contact-info')}>
                        <div className={cx('location')}>
                            <p>{contactAddress}</p>
                            <a href={contactMapUrl} target="_blank" rel="noopener noreferrer">Google Maps</a>
                        </div>
                        <div className={cx('phone-email')}>
                            {contactPhone && <p>Hotline: <a href={`tel:${contactPhone.replace(/\s/g, '')}`}>{contactPhone}</a></p>}
                            {contactEmail && <p>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>}
                            <Link to="/contact">Thông tin liên hệ</Link>
                        </div>
                    </div>
                    <div className={cx('social-section')}>
                        <h4>Kết nối qua mạng xã hội</h4>
                        <SocialLinks compact />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Footer;
