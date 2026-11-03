// Default: read-only live GHN checks. Optional shipment cycle is sandbox-only.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ghn = require('../src/services/ghn.client');
const shipping = require('../src/services/shipping.service');
async function main() {
    const settings = ghn.config();
    const lifecycle = process.argv.includes('--shipment');
    if (lifecycle && settings.environment !== 'sandbox') throw new Error('Shipment verification is sandbox-only.');
    const ps = await shipping.provinces();
    const p = ps.find(row => row.id === 202) || ps.find(row => row.id === 201);
    if (!p) throw new Error('No reference province available in this GHN environment.');
    const ds = await shipping.districts(p.id);
    const d = ds.find(row => row.id === 1452) || ds[0];
    const ws = await shipping.wards(d.id);
    const to = await shipping.destination({ provinceId: p.id, districtId: d.id, wardCode: ws[0].id, street: 'Sandbox integration test - do not deliver' });
    const parcel = { weight: 550, length: 20, width: 16, height: 12 };
    const quote = await shipping.price(parcel, to, 1000000, 'VNPAY');
    assert.equal(quote.grossFee, quote.support + quote.customerFee);
    console.log(JSON.stringify({ environment: settings.environment, quote: 'PASS', grossFee: quote.grossFee,
        vnPayCustomerFee: quote.customerFee, etaAvailable: !!quote.expectedDelivery }));
    if (!lifecycle) return;
    const clientCode = `ECOM-TEST-${crypto.randomUUID().replace(/-/g, '')}`;
    let code;
    try {
        const created = await ghn.request('/v2/shipping-order/create', { ...parcel, service_type_id: 2, payment_type_id: 1,
            client_order_code: clientCode, required_note: 'CHOXEMHANGKHONGTHU', cod_amount: 0, insurance_value: 1000000,
            to_name: 'ECOMMOR SANDBOX TEST - DO NOT DELIVER', to_phone: '0900000000', to_address: shipping.fullAddress(quote),
            to_district_id: to.districtId, to_ward_code: to.wardCode,
            to_province_name: to.provinceName, to_district_name: to.districtName, to_ward_name: to.wardName,
            is_new_to_address: false, items: [{ name: 'Sandbox watch fixture', quantity: 1, price: 1000000 }] });
        code = created.order_code;
        assert.ok(code);
        const detail = await ghn.request('/v2/shipping-order/detail', { order_code: code }, 'GET');
        const byClient = await ghn.request('/v2/shipping-order/detail-by-client-code', { client_order_code: clientCode }, 'GET');
        assert.equal(detail.order_code, code); assert.equal(byClient.order_code, code);
        assert.equal(detail.client_order_code, clientCode);
        console.log('Sandbox create + detail + client-code recovery: PASS');
    } finally {
        // Only cancel the sandbox fixture created in this run; never touch shop orders.
        if (code) {
            const results = await ghn.request('/v2/switch-status/cancel', { order_codes: [code], reason: 'Sandbox integration verification complete' });
            assert.equal(results.find(row => row.order_code === code)?.result, true);
            console.log('Sandbox test fixture cancelled: PASS');
        }
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
