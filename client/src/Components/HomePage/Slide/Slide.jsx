import Slider from 'react-slick';
import classNames from 'classnames/bind';
import styles from './Slide.module.scss';

const cx = classNames.bind(styles);
var settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 3000,
};

function Slide() {
    return (
        <div className={cx('wrapper')}>
            <Slider {...settings}>
                <div>
                    <img src="https://louris.wpbingosite.com/wp-content/uploads/2025/04/slider.jpg" alt="" />
                </div>
                <div>
                    <img src="https://louris.wpbingosite.com/wp-content/uploads/2025/04/slider-3.jpg" alt="" />
                </div>
                <div>
                    <img src="https://louris.wpbingosite.com/wp-content/uploads/2025/04/slider-2.jpg" alt="" />
                </div>
            </Slider>
        </div>
    );
}

export default Slide;
