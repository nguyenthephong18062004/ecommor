import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faInstagram, faTiktok, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { socialLinks } from '../../config/contactInfo';
import styles from './SocialLinks.module.scss';

const cx = classNames.bind(styles);

const channels = [
    { name: 'Facebook', key: 'facebook', icon: <FontAwesomeIcon icon={faFacebook} /> },
    { name: 'Zalo', key: 'zalo', icon: <img src="/icons/zalo.svg" alt="" width={24} height={24} /> },
    { name: 'TikTok', key: 'tiktok', icon: <FontAwesomeIcon icon={faTiktok} /> },
    { name: 'Instagram', key: 'instagram', icon: <FontAwesomeIcon icon={faInstagram} /> },
    { name: 'YouTube', key: 'youtube', icon: <FontAwesomeIcon icon={faYoutube} /> },
];

function SocialLinks({ compact = false }) {
    return (
        <div className={cx('list', { compact })}>
            {channels.map(channel => (
                <a key={channel.key} href={socialLinks[channel.key]}
                    target={socialLinks[channel.key] === '#' ? undefined : '_blank'} rel="noopener noreferrer"
                    aria-label={channel.name} title={channel.name} className={cx('link')}>
                    {channel.icon}{!compact && <span>{channel.name}</span>}
                </a>
            ))}
        </div>
    );
}

export default SocialLinks;
