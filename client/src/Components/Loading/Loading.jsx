import { Spin } from 'antd';
import classNames from 'classnames/bind';
import styles from './Loading.module.scss';

const cx = classNames.bind(styles);

function Loading() {
    return (
        <div className={cx('wrapper')}>
            <Spin size="large" />
        </div>
    );
}

export default Loading;
