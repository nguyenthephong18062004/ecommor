import { useMemo } from 'react';
import DOMPurify from 'dompurify';

export default function RichText({ html, ...props }) {
    const safe = useMemo(() => DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
        FORBID_ATTR: ['style', 'srcset'], ALLOW_DATA_ATTR: false }), [html]);
    return <div {...props} dangerouslySetInnerHTML={{ __html: safe }} />;
}
