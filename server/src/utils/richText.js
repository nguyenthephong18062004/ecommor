const sanitize = require('sanitize-html');

// Không cho phép script, iframe, SVG, CSS hoặc event handler trong nội dung biên tập.
const options = {
    allowedTags: ['p', 'br', 'hr', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
        'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'span', 'div'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'],
        th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
};

const richText = value => sanitize(typeof value === 'string' ? value : '', options);
module.exports = { richText };
