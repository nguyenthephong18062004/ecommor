import classNames from 'classnames/bind';
import styles from './Footer.module.scss';

const cx = classNames.bind(styles);

function Footer() {
    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('column')}>
                    <h3 className={cx('title')}>ĐỒNG HỒ LUXTIME</h3>
                    <p className={cx('description')}>
                        LuxTime là thương hiệu chuyên cung cấp đồng hồ chính hãng đến từ Thụy Sỹ, Nhật Bản và các thương
                        hiệu uy tín toàn cầu. Cam kết 100% hàng thật – bảo hành toàn quốc.
                    </p>
                    <div className={cx('certification')}>
                        <img
                            src="https://theme.hstatic.net/200000065946/1001264503/14/logo_bct.png?v=880"
                            alt="Đã thông báo Bộ Công Thương"
                        />
                        <img
                            src="https://images.dmca.com/Badges/dmca_protected_18_120.png?ID=c870a589-fd82-4c14-9e41-c3891ec42fb5"
                            alt="Protected by DMCA"
                        />
                    </div>
                </div>

                <div className={cx('column')}>
                    <h3 className={cx('title')}>CHÍNH SÁCH</h3>
                    <ul className={cx('service-list')}>
                        <li>
                            <a href="#">Chính Sách Bán Hàng</a>
                        </li>
                        <li>
                            <a href="#">Chính Sách Giao Hàng & Thanh Toán</a>
                        </li>
                        <li>
                            <a href="#">Chính Sách Bảo Hành & Sửa Chữa</a>
                        </li>
                        <li>
                            <a href="#">Chính Sách Đổi Trả</a>
                        </li>
                        <li>
                            <a href="#">Hướng Dẫn Mua Hàng</a>
                        </li>
                        <li>
                            <a href="#">Chính Sách Đại Lý</a>
                        </li>
                    </ul>
                </div>

                <div className={cx('column')}>
                    <h3 className={cx('title')}>LIÊN HỆ</h3>
                    <div className={cx('contact-info')}>
                        <div className={cx('location')}>
                            <p className={cx('location-title')}>
                                <strong>[TP. Hồ Chí Minh]</strong>
                            </p>
                            <p>123 Lê Lợi, Quận 1, TP. HCM</p>
                            <p className={cx('hotline')}>Hotline: 0909 999 888</p>
                        </div>

                        <div className={cx('location')}>
                            <p className={cx('location-title')}>
                                <strong>[Hà Nội]</strong>
                            </p>
                            <p>456 Kim Mã, Ba Đình, Hà Nội</p>
                            <p className={cx('hotline')}>Hotline: 0988 123 456</p>
                        </div>

                        <div className={cx('phone-email')}>
                            <p>0933 456 789 (Zalo/Hotline)</p>
                            <p>support@luxtime.vn</p>
                        </div>

                        <div className={cx('company-info')}>
                            <p>Công Ty TNHH Đồng Hồ LuxTime - MST: 0312345678 - Ngân hàng Vietcombank CN Sài Gòn</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Footer;
