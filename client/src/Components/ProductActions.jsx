import { Button, Space, Tooltip } from 'antd';
import { HeartFilled, HeartOutlined, SwapOutlined } from '@ant-design/icons';
import { useStore } from '../hooks/userStore';

export default function ProductActions({ id }) {
    const { wishlist, compare, toggleWishlist, toggleCompare, preferencesBusy, preferencesError } = useStore();
    const favorite = wishlist.includes(id);
    const compared = compare.includes(id);
    return <Space size={4}>
        <Tooltip title={preferencesError || (favorite ? 'Bỏ yêu thích' : 'Lưu yêu thích')}>
            <Button size="small" type="text" aria-label={favorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
                aria-pressed={favorite} disabled={preferencesBusy || Boolean(preferencesError)}
                icon={favorite ? <HeartFilled style={{ color: '#a3262c' }} /> : <HeartOutlined />}
                onClick={() => toggleWishlist(id)} />
        </Tooltip>
        <Tooltip title={compared ? 'Bỏ so sánh' : 'Thêm vào so sánh'}>
            <Button size="small" type={compared ? 'primary' : 'text'} aria-label={compared ? 'Bỏ so sánh' : 'Thêm vào so sánh'}
                aria-pressed={compared} icon={<SwapOutlined />} onClick={() => toggleCompare(id)} />
        </Tooltip>
    </Space>;
}
