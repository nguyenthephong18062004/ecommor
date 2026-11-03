export const contactAddress = 'Ngõ 85 Lê Văn Hiến, Bắc Từ Liêm, Hà Nội';
export const contactMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}`;

export const contactPhone = import.meta.env.VITE_CONTACT_PHONE?.trim() || '';
export const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim() || '';

// Thay # bằng link trang tương ứng. Contact và Footer cùng dùng các link này.
export const socialLinks = {
    facebook: 'https://www.facebook.com/people/LuxTime-Vietnam-%C4%90%E1%BB%93ng-H%E1%BB%93-Ch%E1%BA%BF-T%C3%A1c-H%C3%A0-N%C3%B4i/61576236249734/', // Ví dụ: https://www.facebook.com/ten-trang
    zalo: 'https://zalo.me/2591264714376033221', 
    tiktok: 'https://www.tiktok.com/@donghodoiluxury', 
    instagram: 'https://www.instagram.com/luxtime.co_/', 
    youtube: 'https://www.youtube.com/@LuxTimeVietNam', 
};
