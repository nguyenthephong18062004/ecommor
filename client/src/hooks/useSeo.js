import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function useSeo({ title, description = 'Khám phá đồng hồ theo thương hiệu, bộ máy và ngân sách tại ECOMMOR.', product, breadcrumbs } = {}) {
    const { pathname } = useLocation();
    const schemaKey = JSON.stringify({ product: product && Object.fromEntries([
        'nameProduct', 'modelNumber', 'brand', 'images', 'publicationStatus', 'verificationStatus', 'price', 'discount', 'stock', 'allowPreorder',
    ].map(key => [key, product[key]])), breadcrumbs });
    useEffect(() => {
        const { product: currentProduct, breadcrumbs: currentBreadcrumbs } = JSON.parse(schemaKey);
        document.title = `${title || 'Đồng hồ'} | ECOMMOR`;
        const set = (selector, tag, attributes) => {
            const node = document.head.querySelector(selector) || document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
            document.head.appendChild(node);
        };
        set('meta[name="description"]', 'meta', { name: 'description', content: description.slice(0, 180) });
        const canonical = new URL(pathname, window.location.origin).href;
        set('link[rel="canonical"]', 'link', { rel: 'canonical', href: canonical });
        const data = [];
        if (currentProduct) data.push({ '@context': 'https://schema.org', '@type': 'Product', name: currentProduct.nameProduct,
            sku: currentProduct.modelNumber, brand: { '@type': 'Brand', name: currentProduct.brand },
            image: currentProduct.images?.split(',').filter(url => /^https?:\/\//.test(url)),
            ...(currentProduct.publicationStatus === 'published' && currentProduct.verificationStatus === 'verified' ? {
                offers: { '@type': 'Offer', url: canonical, priceCurrency: 'VND',
                    price: Math.round(currentProduct.price * (100 - (currentProduct.discount || 0)) / 100),
                    availability: `https://schema.org/${currentProduct.stock > 0 ? 'InStock' : currentProduct.allowPreorder ? 'PreOrder' : 'OutOfStock'}` },
            } : {}) });
        if (currentBreadcrumbs?.length) data.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            itemListElement: currentBreadcrumbs.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1,
                name, item: new URL(path, window.location.origin).href })) });
        if (!data.length) return undefined;
        const node = document.createElement('script');
        node.type = 'application/ld+json';
        node.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
        document.head.appendChild(node);
        return () => node.remove();
    }, [title, description, pathname, schemaKey]);
}
