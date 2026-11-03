"""Sinh artifact API từ hợp đồng đã đối chiếu code. Chỉ dùng Python standard library."""
import argparse
import copy
import json
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ID = '507f1f77bcf86cd799439011'
DATE = '2026-11-02T03:00:00.000Z'


def text(description='', **kw):
    return dict(type='string', **({'description': description} if description else {}), **kw)


def integer(description='', **kw):
    return dict(type='integer', **({'description': description} if description else {}), **kw)


def obj(properties=None, required=(), **kw):
    result = dict(type='object', properties=properties or {}, **kw)
    if required:
        result['required'] = list(required)
    return result


def array(items, **kw):
    return dict(type='array', items=items, **kw)


def ref(name):
    return {'$ref': '#/components/schemas/' + name}


def enum(values, **kw):
    return text(enum=values.split() if isinstance(values, str) else values, **kw)


OID = text('MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử.', pattern='^[a-fA-F0-9]{24}$', example=ID)
MONEY = integer('Số nguyên VND, không dùng chuỗi có dấu chấm phân cách.', minimum=0)
TIME = text(format='date-time', example=DATE)
FREE = obj(additionalProperties=True, description='Các field trả trực tiếp từ model có thể thay đổi; xem giới hạn hiện trạng.')
SCHEMAS = {'ObjectId': OID, 'Money': MONEY, 'FlexibleObject': FREE,
           'Error': obj({'success': {'type': 'boolean', 'example': False}, 'message': text(),
                         'errorCode': text(), 'requestId': text()}, ['message']),
           'MessageOnly': obj({'message': text()}, ['message']),
           'Category': obj({'_id': OID, 'name': text(), 'createdAt': TIME, 'updatedAt': TIME}),
           'Brand': obj({'name': text(), 'description': text(), 'logo': text(), 'productCount': integer(minimum=0)}),
           'Parcel': obj({'weight': integer('Gram; dưới 20 kg.', minimum=1, maximum=19999),
                          **{key: integer('Centimet.', minimum=1, maximum=200) for key in ['length', 'width', 'height']}},
                         ['weight', 'length', 'width', 'height']),
           'Location': obj({'id': {'oneOf': [integer(), text()]}, 'name': text()}, ['id', 'name'])}

PRODUCT = {key: text(maxLength=2000) for key in ['nameProduct', 'modelNumber', 'brand', 'collection', 'category', 'origin',
           'gender', 'glassMaterial', 'movement', 'powerReserve', 'warrantyGlobal', 'bezelMaterial', 'strapMaterial',
           'faceColor', 'waterResistance', 'verificationNote', 'boxPapers']}
PRODUCT.update(price=integer('Giá gốc VND.', minimum=1, maximum=90071992547409),
               stock=integer(minimum=0, maximum=1000000),
               discount={'type': 'number', 'minimum': 0, 'maximum': 100, 'multipleOf': 0.01},
               dialDiameter={'type': 'number', 'minimum': 0}, caseThickness={'type': 'number', 'minimum': 0},
               description=text('HTML được sanitize ở server.', maxLength=100000),
               images=text('Chuỗi URL phân cách bằng dấu phẩy; http(s) hoặc /uploads/.', maxLength=20000),
               publicationStatus=enum('preview published archived'), verificationStatus=enum('unverified verified demo'),
               condition=enum('new preowned'), allowPreorder={'type': 'boolean'},
               expectedRestockAt=text('YYYY-MM-DD; chuỗi rỗng/null để bỏ ngày.', nullable=True),
               shippingPackage={**SCHEMAS['Parcel'], 'nullable': True})
REQUIRED_PRODUCT = ['nameProduct', 'modelNumber', 'brand', 'origin', 'gender', 'glassMaterial', 'movement',
                    'strapMaterial', 'waterResistance', 'description', 'images', 'price', 'stock', 'dialDiameter']
SCHEMAS['ProductCreate'] = obj(PRODUCT, REQUIRED_PRODUCT)
SCHEMAS['ProductUpdate'] = obj({'id': OID, **PRODUCT}, ['id'])
product_out = copy.deepcopy(PRODUCT)
product_out.update(_id=OID, createdAt=TIME, updatedAt=TIME, soldCount=integer(), expectedRestockAt={**TIME, 'nullable': True},
                   categoryId=OID, canPreorder={'type': 'boolean'}, isNew={'type': 'boolean'})
SCHEMAS['Product'] = obj(product_out, description='Public list chỉ trả projection; sản phẩm cũ có thể thiếu trạng thái. Admin get-all đổi category thành tên và thêm categoryId.')
SCHEMAS['ProductDetail'] = obj({'product': ref('Product'), 'relatedProducts': array(ref('Product'))}, ['product', 'relatedProducts'])
SCHEMAS['Browse'] = obj({'items': array(ref('Product')), **{key: integer() for key in ['total', 'page', 'pageSize', 'totalPages']}}, ['items', 'total', 'page', 'pageSize', 'totalPages'])
SCHEMAS['HomeCatalog'] = obj({**SCHEMAS['Browse']['properties'], 'section': FREE, 'sections': array(FREE)})
SCHEMAS['CatalogOptions'] = obj({'categories': array(ref('Category')), 'brands': array(text()), 'brandDetails': array(ref('Brand')),
                                'priceMax': MONEY, **{key: array(text()) for key in ['collection', 'gender', 'movement', 'strapMaterial', 'faceColor']}})
SCHEMAS['Profile'] = obj({'_id': OID, 'fullName': text(), 'email': text(), 'phone': text(), 'address': text(),
                          'isAdmin': {'type': 'boolean'}, 'typeLogin': enum('email google')})
SCHEMAS['Tokens'] = obj({'token': text('Opaque JWT; không đưa token thật vào tài liệu.'), 'refreshToken': text()}, ['token'])
SCHEMAS['SavedAddress'] = obj({'label': text(maxLength=40), 'fullName': text(maxLength=100),
                              'phone': text(pattern=r'^(?:0|\+84)[35789]\d{8}$'), 'address': text(maxLength=250),
                              'provinceId': integer(minimum=1), 'districtId': integer(minimum=1), 'wardCode': text(maxLength=20)},
                             ['label', 'fullName', 'phone', 'address', 'provinceId', 'districtId', 'wardCode'])
SCHEMAS['Preferences'] = obj({'wishlist': array(OID, maxItems=100),
    'savedSearches': array(obj({'name': text(maxLength=80), 'url': text('Đường dẫn nội bộ /category/...; không nhận URL ngoài.', maxLength=2000)}, ['name', 'url']), maxItems=10),
    'addresses': array(ref('SavedAddress'), maxItems=8)}, additionalProperties=False)
SCHEMAS['PreferencesPatch'] = {**SCHEMAS['Preferences'], 'minProperties': 1}
SCHEMAS['CouponInput'] = obj({'nameCoupon': text(), 'discount': MONEY, 'quantity': integer(), 'minPrice': MONEY,
                              'startDate': TIME, 'endDate': TIME}, ['nameCoupon', 'discount', 'quantity', 'minPrice', 'startDate', 'endDate'],
                             description='Khuyến nghị client gửi giá trị hợp lệ như schema. CRUD legacy chỉ kiểm tra truthy, chưa enforce mọi giới hạn này.')
SCHEMAS['Coupon'] = obj({'_id': OID, **SCHEMAS['CouponInput']['properties']})
SCHEMAS['Cart'] = obj({'cartId': OID, 'cartItems': array(obj({'item': obj({'productId': OID, 'quantity': integer()}), 'product': ref('Product')})),
                       'totalPrice': {'type': 'number', 'minimum': 0, 'description': 'Tạm tính legacy có thể còn phần thập phân; quote/checkout mới làm tròn VND.'},
                       'dataCoupon': array(ref('Coupon'))}, ['cartItems', 'totalPrice', 'dataCoupon'])
SCHEMAS['Order'] = obj({'_id': OID, 'userId': OID, 'product': array(obj({'productId': OID, 'quantity': integer(),
    'unitPrice': MONEY, 'nameProduct': text(), 'images': text(), 'shippingPackage': FREE})),
    'fullName': text(), 'phone': text(), 'address': text(), 'note': text(), 'paymentMethod': enum('COD VNPAY MOMO'),
    'status': enum('pending confirmed shipped delivered cancelled'),
    'paymentStatus': enum('unpaid pending paid failed expired refund_required'),
    'totalPrice': MONEY, 'subtotal': MONEY, 'couponDiscount': MONEY, 'shippingFee': MONEY, 'shipping': FREE,
    'shipment': FREE, 'expiresAt': TIME, 'transactionRef': text(), 'createdAt': TIME, 'updatedAt': TIME})
SCHEMAS['OrderView'] = obj({'orderId': OID, 'createdAt': TIME, 'fullName': text(), 'phone': text(), 'address': text(),
    'note': text(), 'paymentMethod': text(), 'status': text(), 'paymentStatus': text(), 'expiresAt': TIME,
    'shippingFee': MONEY, 'couponDiscount': MONEY, 'totalPrice': MONEY, 'shipping': FREE, 'shipment': FREE,
    'products': array(obj({'id': OID, 'productId': OID, 'nameProduct': text(), 'price': MONEY, 'quantity': integer(), 'image': text(), 'images': text()}))},
    description='Chi tiết dùng id/image; danh sách đơn dùng productId/images. Field có thể thiếu theo endpoint.')
SCHEMAS['ShippingQuote'] = obj({'quoteId': OID, 'method': enum('COD VNPAY'), 'expiresAt': TIME, 'provider': text(),
    'environment': text(), 'shopId': integer(), 'serviceTypeId': integer(), 'origin': FREE, 'destination': FREE,
    'parcel': FREE, 'grossFee': MONEY, 'support': MONEY, 'customerFee': MONEY, 'subtotal': MONEY,
    'couponDiscount': MONEY, 'totalPrice': MONEY, 'insuranceValue': MONEY, 'insuranceLimited': {'type': 'boolean'},
    'expectedDelivery': {**TIME, 'nullable': True}}, ['quoteId', 'method', 'expiresAt', 'totalPrice'])
PREORDER_STATUS = 'pending contacted confirmed cancelled'
SCHEMAS['PreorderInput'] = obj({'productId': OID, 'quantity': integer(minimum=1, maximum=10),
    'fullName': text(maxLength=100), 'phone': text('Số Việt Nam; server loại khoảng trắng và dấu phân cách.', maxLength=20),
    'email': text(maxLength=254), 'address': text(maxLength=500), 'note': text(maxLength=2000), 'consent': {'type': 'boolean', 'enum': [True]}},
    ['productId', 'quantity', 'fullName', 'phone', 'consent'])
SCHEMAS['Preorder'] = obj({'_id': OID, 'userId': OID, **SCHEMAS['PreorderInput']['properties'], 'status': enum(PREORDER_STATUS),
    'productName': text(), 'modelNumber': text(), 'image': text(), 'unitPrice': MONEY, 'totalPrice': MONEY,
    'consentAt': TIME, 'createdAt': TIME, 'history': array(obj({'status': text(), 'note': text(), 'at': TIME}))})
SCHEMAS['PreordersPage'] = obj({'items': array(ref('Preorder')), 'total': integer(), 'page': integer(), 'limit': integer()})
SCHEMAS['Review'] = obj({'_id': OID, 'productId': OID, 'content': text(), 'rating': integer(minimum=1, maximum=5),
    'createdAt': TIME, 'user': obj({'name': text()}), 'verifiedPurchase': {'type': 'boolean'}, 'moderationStatus': enum('pending approved rejected')})
SCHEMAS['ReviewsPage'] = obj({'items': array(ref('Review')), 'total': integer(), 'page': integer(), 'pageSize': integer()})
SCHEMAS['Blog'] = obj({'_id': OID, 'title': text(), 'content': text('HTML đã sanitize.'), 'image': text(), 'createdAt': TIME, 'updatedAt': TIME})
SCHEMAS['ChatMessage'] = obj({'_id': OID, 'senderId': OID, 'receiverId': OID, 'conversationId': text(),
    'text': text(), 'isRead': {'type': 'boolean'}, 'createdAt': TIME})


def envelope(metadata=FREE):
    return obj({'message': text(), 'statusCode': integer(), 'metadata': metadata}, ['message', 'statusCode', 'metadata'])


def body(schema, example, media='application/json', required=True):
    return {'required': required, 'content': {media: {'schema': schema, 'example': example}}}


def query(name, schema=None, required=False, description='', example=None):
    p = {'name': name, 'in': 'query', 'required': required, 'schema': schema or text(), 'description': description}
    if example is not None:
        p['example'] = example
    return p


def response(schema, description='Thành công', example=None):
    media = {'schema': schema}
    if example is not None:
        media['example'] = example
    return {'description': description, 'content': {'application/json': media}}


PREFIXES = {'blog.routes.js': '/api/blog', 'brand.routes.js': '/api/brands', 'preferences.routes.js': '/api/preferences',
            'preorder.routes.js': '/api/preorders', 'shipping.routes.js': '/api/shipping', 'message.routes.js': '/api/message'}


def inventory():
    rows = []
    for file in sorted((ROOT / 'server/src/routes').glob('*.js')):
        if file.name == 'index.js':
            continue
        source = file.read_text(encoding='utf-8-sig')
        for m in re.finditer(r"router\.(get|post|put|patch|delete)\('([^']+)'([^\n]*)", source):
            method, path, tail = m.groups()
            path = re.sub(r':([a-zA-Z]+)', r'{\1}', (PREFIXES.get(file.name, '') + path).rstrip('/'))
            auth = 'admin' if 'authAdmin' in tail else 'user' if 'authUser' in tail or 'router.use(authUser)' in source else 'public'
            rows.append({'method': method, 'path': path, 'auth': auth,
                         'source': f'{file.relative_to(ROOT).as_posix()}:{source[:m.start()].count(chr(10)) + 1}'})
    for method, path, auth, name in [('post', '/api/upload-image', 'admin', 'server/src/routes/index.js'),
                                     ('post', '/api/chatbot', 'user', 'server/src/server.js')]:
        lines = (ROOT / name).read_text(encoding='utf-8-sig').splitlines()
        line = next(i for i, s in enumerate(lines, 1) if f"app.{method}('{path}'" in s)
        rows.append(dict(method=method, path=path, auth=auth, source=f'{name}:{line}'))
    return rows


OPS = {}


def op(method, path, tag, summary, *, data=FREE, request=None, params=(), description='', codes=(200,), errors=(400, 403, 500),
       responses=None, security=None, deprecated=False, caveat='', rate=None, postman=None, evidence=None):
    key = (method.lower(), path)
    if key in OPS:
        raise ValueError('Duplicate operation ' + str(key))
    OPS[key] = dict(tag=tag, summary=summary, data=data, request=request, params=list(params), description=description,
                    codes=codes, errors=errors, responses=responses, security=security, deprecated=deprecated,
                    caveat=caveat, rate=rate, postman=postman, evidence=evidence)


def input_fields(fields, required=None):
    return obj(fields, list(fields) if required is None else required)


def register_operations():
    email = text(format='email', example='khach@example.test')
    password = text(writeOnly=True)
    registration = {'fullName': text(), 'email': email, 'password': password, 'phone': text(), 'address': text()}
    op('post', '/api/register', 'Tài khoản', 'Đăng ký và gửi OTP email', data=FREE,
       request=body(input_fields(registration), dict(fullName='Nguyễn Văn An', email='khach@example.test', password='<MAT_KHAU_THU>', phone='0900000000', address='Địa chỉ thử nghiệm')),
       codes=(201, 202), errors=(400, 429, 503, 500), rate='5 request/giờ/IP; thêm cooldown 60 giây và 5 mã/giờ/email + mục đích.',
       description='Chưa tạo user trước xác minh. Email đã có trả 202 với thông báo chung; không dùng status để suy luận tồn tại tài khoản.', evidence='server/src/controllers/users.controller.js:500')
    for path, summary in [('/api/verify-email', 'Xác minh OTP đăng ký'), ('/api/verify-reset-password', 'Xác minh OTP quên mật khẩu')]:
        op('post', path, 'Tài khoản', summary, data=FREE,
           request=body(input_fields({'email': email, 'otp': text(pattern=r'^\d{6}$')}), {'email': 'khach@example.test', 'otp': '123456'}),
           errors=(400, 429, 500), rate='15 request/15 phút/IP; OTP 10 phút, tối đa 5 lần sai.',
           description='OTP là fixture minh họa, phải thay bằng mã nhận được. Xác minh reset đặt cookie tokenResetPassword sống 5 phút; xác minh đăng ký không tự đăng nhập.')
    for path, summary in [('/api/resend-verification', 'Gửi lại OTP đăng ký'), ('/api/forgot-password', 'Yêu cầu OTP đặt lại mật khẩu')]:
        op('post', path, 'Tài khoản', summary, data=FREE, request=body(input_fields({'email': email}), {'email': 'khach@example.test'}),
           codes=(202,), errors=(400, 429, 503, 500), rate='Chung bộ đếm gửi OTP: 5 request/giờ/IP; giới hạn thêm theo email.',
           description='Trả thông báo chung. forgot-password nuốt một số lỗi gửi mail để tránh dò email; 202 không bảo đảm email đã được chuyển phát.')
    op('post', '/api/login', 'Tài khoản', 'Đăng nhập bằng email và mật khẩu', data=ref('Tokens'),
       request=body(input_fields({'email': email, 'password': password}), {'email': 'khach@example.test', 'password': '<MAT_KHAU_THU>'}),
       errors=(403, 500), description='Đặt cookie token (15 phút), refreshToken (7 ngày), logged. Sai tài khoản/mật khẩu hiện trả 403, không phải 401. Không hỗ trợ Authorization: Bearer.')
    op('post', '/api/login-google', 'Tài khoản', 'Đăng nhập bằng Google ID token', data=ref('Tokens'),
       request=body(input_fields({'credential': text(writeOnly=True)}), {'credential': '<GOOGLE_ID_TOKEN_THU>'}),
       errors=(403, 500), description='Server verify ID token, audience và email_verified; trả cookie như đăng nhập thường.')
    op('get', '/api/auth', 'Tài khoản', 'Đọc tài khoản từ phiên đăng nhập', data=obj({'auth': ref('Profile')}))
    op('get', '/api/refresh-token', 'Tài khoản', 'Làm mới access token bằng cookie refreshToken', data=ref('Tokens'),
       security=[{'refreshCookie': []}], errors=(401, 403, 500), description='Thiếu refresh cookie hiện trả 403; sai/hết hạn có thể 401. Chỉ trả token access mới, không xoay refreshToken.')
    op('get', '/api/logout', 'Tài khoản', 'Đăng xuất và xóa cookie phiên', data=FREE,
       description='GET này có tác dụng ghi: xóa khóa phiên khi xác minh được token, clear token/refreshToken/logged. Cookie có thể không tồn tại.')
    op('post', '/api/update-user', 'Tài khoản', 'Cập nhật hồ sơ của phiên hiện tại', data=FREE,
       request=body(obj({'fullName': text(), 'phone': text(), 'address': text()}), {'fullName': 'Nguyễn Văn An', 'phone': '0900000000', 'address': 'Địa chỉ thử nghiệm'}),
       caveat='Handler trả nguyên document user, có thể chứa password hash. Không lưu/log response này. Cần sửa server trước khi coi đây là DTO công khai ổn định.')
    op('post', '/api/reset-password', 'Tài khoản', 'Đặt mật khẩu sau khi xác minh OTP', data=FREE,
       request=body(input_fields({'password': password, 'confirmPassword': password}), {'password': '<MAT_KHAU_MOI_THU>', 'confirmPassword': '<MAT_KHAU_MOI_THU>'}),
       security=[{'resetCookie': []}], errors=(400, 401, 500), description='Chỉ nhận cookie tokenResetPassword. Không nhận email/OTP thay cho bằng chứng xác minh ở bước này; hai mật khẩu phải giống nhau.')
    op('get', '/api/users', 'Quản trị tài khoản', 'Danh sách người dùng', data=array(FREE),
       caveat='Trả nguyên documents, chưa phân trang và có thể chứa password hash; xem giới hạn hiện trạng. Không có filter trạng thái khóa.')
    op('post', '/api/update-user-admin', 'Quản trị tài khoản', 'Đổi quyền admin của tài khoản', data=FREE,
       request=body(input_fields({'id': OID, 'isAdminUser': {'type': 'boolean'}}), {'id': ID, 'isAdminUser': False}),
       description='isAdminUser=true để cấp admin, false để thu quyền. Đây không phải API khóa/mở khóa tài khoản.')
    op('get', '/api/admin', 'Quản trị tài khoản', 'Kiểm tra quyền admin', responses={'200': response(obj({'message': {'type': 'boolean'}}), example={'message': True})})
    op('get', '/api/statistical', 'Báo cáo', 'Thống kê dashboard hiện có', data=FREE,
       responses={'200': response(obj({'success': {'type': 'boolean'}, 'message': text(), 'metadata': FREE}, ['success', 'message', 'metadata']))},
       description='Không có query lọc ngày. metadata có users, products, orders, revenue, reviews. revenue cộng totalPrice đơn delivered theo createdAt; chưa là báo cáo hoàn tiền hay sổ kế toán.',
       caveat='Lỗi tại handler có thể trả {message, error} khác envelope chung; chưa có bộ lọc chung/chuẩn doanh thu đầy đủ.')

    op('get', '/api/get-all-category', 'Danh mục', 'Danh sách danh mục', data=array(ref('Category')))
    for path, summary in [('/api/create-category', 'Tạo danh mục'), ('/api/update-category', 'Cập nhật danh mục')]:
        creating = 'create' in path
        fields = {'name': text()} if creating else {'id': OID, 'name': text()}
        example = {'name': 'Đồng hồ thử nghiệm'} if creating else {'id': ID, 'name': 'Đồng hồ thử nghiệm'}
        op('post', path, 'Danh mục', summary, data=ref('Category'), request=body(input_fields(fields), example), codes=(201,) if creating else (200,))
    op('delete', '/api/delete-category', 'Danh mục', 'Xóa danh mục và các sản phẩm thuộc danh mục', data=ref('Category'),
       params=[query('id', OID, True, example=ID)],
       caveat='Có tác dụng deleteMany sản phẩm thuộc danh mục. Không dùng như ngừng bán. Nhánh không tìm thấy đang tham chiếu NotFoundError chưa import, có thể thành 500.')
    op('get', '/api/brands', 'Thương hiệu', 'Danh sách thương hiệu và số sản phẩm', data=array(ref('Brand')))
    op('put', '/api/brands/{name}', 'Thương hiệu', 'Upsert giới thiệu/logo thương hiệu', data=FREE,
       request=body(input_fields({'description': text(maxLength=3000), 'logo': text('Chuỗi rỗng hoặc URL http(s).', maxLength=1000)}),
                    {'description': 'Giới thiệu thương hiệu thử nghiệm.', 'logo': ''}),
       description='Path name dài tối đa 100 ký tự; key được chuẩn hóa từ name. Cả description và logo phải là string, có thể rỗng.')

    product_example = dict(nameProduct='Đồng hồ minh họa', modelNumber='DEMO-001', brand='Thương hiệu thử', origin='Chưa xác minh',
        gender='Nam', glassMaterial='Kính khoáng', movement='Quartz', strapMaterial='Da', waterResistance='Theo tài liệu mẫu',
        description='<p>Dữ liệu minh họa phục vụ kiểm thử.</p>', images='/uploads/products/fixture.png',
        price=1000000, stock=0, dialDiameter=40, publicationStatus='preview', verificationStatus='demo', allowPreorder=False)
    op('post', '/api/create-product', 'Sản phẩm', 'Tạo sản phẩm', data=ref('Product'), request=body(ref('ProductCreate'), product_example), codes=(201,),
       description='Giữ trạng thái preview/demo cho dữ liệu thử. verificationStatus=verified yêu cầu verificationNote. Giá/stock phải là JSON number đúng kiểu, không nhận chuỗi số.')
    op('post', '/api/update-product', 'Sản phẩm', 'Cập nhật các field sản phẩm được gửi', data=ref('Product'),
       request=body(ref('ProductUpdate'), {'id': ID, 'stock': 0, 'publicationStatus': 'preview'}), errors=(400, 404, 403, 500),
       description='Field không gửi được giữ nguyên. Không thay nameProduct bằng name. category là ID. expectedRestockAt nhận YYYY-MM-DD và lưu theo ngày Việt Nam.')
    op('delete', '/api/delete-product', 'Sản phẩm', 'Xóa cứng sản phẩm', data=ref('Product'), params=[query('id', OID, True, example=ID)],
       description='Để ngừng bán, ưu tiên update publicationStatus=archived. Endpoint này xóa document thật; không dọn toàn bộ file/quan hệ.')
    op('get', '/api/get-all-product', 'Sản phẩm', 'Danh sách đầy đủ cho admin', data=array(ref('Product')),
       description='Không phân trang. category là tên danh mục, categoryId là ID gốc; chỉ endpoint này có cách biểu diễn category như vậy.')
    op('get', '/api/get-product-by-id', 'Sản phẩm', 'Chi tiết sản phẩm và tối đa 8 sản phẩm liên quan', data=ref('ProductDetail'),
       params=[query('id', OID, True, example=ID)], errors=(400, 404, 500),
       description='Archived trả 404. Preview/chưa xác minh vẫn có thể xem tham khảo. HTML description đã sanitize.')
    op('get', '/api/get-product-new', 'Sản phẩm', 'Tối đa 10 sản phẩm mới còn stock', data=array(ref('Product')),
       description='Có isNew=true. stock>0 không tự đồng nghĩa đủ điều kiện mua; cần kiểm tra publicationStatus và verificationStatus.')
    op('get', '/api/get-product-manufactured', 'Sản phẩm', 'Tối đa 20 sản phẩm giảm từ 10%', data=array(ref('Product')),
       description='Tên route legacy; thực tế lọc discount>=10, không phải thuộc tính nhà sản xuất.')
    op('get', '/api/search', 'Sản phẩm', 'Gợi ý tối đa 8 kết quả tìm kiếm', data=array(ref('Product')),
       params=[query('valueSearch', text(minLength=1, maxLength=100), True, 'Tên, thương hiệu, model hoặc bộ sưu tập.', 'dong ho')])
    op('get', '/api/catalog-options', 'Sản phẩm', 'Lựa chọn bộ lọc và thương hiệu', data=ref('CatalogOptions'))
    browse_params = [query('page', integer(minimum=1), example=1)]
    browse_params += [query(key, text(maxLength=100), description='So khớp field; search hỗ trợ tiếng Việt có/không dấu.') for key in ['category', 'brand', 'search', 'collection', 'gender', 'movement', 'strapMaterial', 'faceColor']]
    browse_params += [query(key, {'type': 'number', 'minimum': 0}, description='Tối đa 2 chữ số thập phân; min không lớn hơn max.') for key in ['minPrice', 'maxPrice', 'minDiameter', 'maxDiameter']]
    browse_params += [query('stock', enum('all in order', default='all')), query('sort', enum('newest priceAsc priceDesc popular discount', default='newest')),
                      query('ids', text(), description='1–20 ObjectId nối bằng dấu phẩy, dùng cho yêu thích/so sánh.')]
    op('get', '/api/catalog-browse', 'Sản phẩm', 'Tìm kiếm, lọc kết hợp và phân trang catalog', data=ref('Browse'), params=browse_params,
       description='20 sản phẩm/trang; sort và lọc giá dùng giá sau giảm, làm tròn VND. Trang vượt cuối được chặn về trang cuối. stock=order cần published + allowPreorder + stock<=0. stock=in chỉ kiểm tra tồn dương.')
    op('get', '/api/product-catalog', 'Sản phẩm', 'Nhóm catalog cho trang chủ', data=ref('HomeCatalog'),
       params=[query('type', enum('new gender brand', default='new')), query('value', text(), description='Bắt buộc cho gender/brand; gender chỉ Nam/Nữ. type=new không nhận value.'), query('page', integer(minimum=1), example=1)],
       description='10 sản phẩm/trang. type=new trả thêm sections, luôn page=1; nhóm gender/brand chỉ thuộc danh mục có tên bắt đầu Đồng hồ.')
    op('get', '/api/get-product-by-category', 'Sản phẩm', 'Lọc danh mục kiểu cũ', data=array(ref('Product')), deprecated=True,
       params=[query('category', text(), True, 'ID danh mục hoặc all.', 'all'), query('price', enum('0 1 2 3 5')), query('discount', text())],
       description='Không phân trang. price: 1 dưới 500k; 2 từ 500k–1tr; 3 từ 1–2tr; 5 trên 5tr. discount nhân 10 để lọc bằng chính xác. Tích hợp mới dùng catalog-browse.')

    for path, summary in [('/api/create-cart', 'Thêm số lượng vào giỏ'), ('/api/update-product-cart', 'Đặt lại số lượng dòng giỏ')]:
        op('post', path, 'Giỏ hàng', summary, data=FREE,
           request=body(input_fields({'productId': OID, 'quantity': integer(minimum=1)}), {'productId': ID, 'quantity': 1}),
           codes=(200, 201) if path == '/api/create-cart' else (200,), errors=(400, 403, 409, 500),
           description='Chỉ sản phẩm published + verified + đủ tồn. create-cart cộng quantity vào dòng cũ; update-product-cart thay bằng quantity mới. Không giữ kho ở bước giỏ.')
    op('get', '/api/get-cart', 'Giỏ hàng', 'Đọc giỏ, giá hiện tại và coupon dùng được', data=ref('Cart'),
       description='Giỏ trống không có cartId. Khi đọc có thể loại dòng sản phẩm đã xóa/sai ID và cập nhật tổng tạm tính; vì vậy GET có thể ghi làm sạch giỏ.')
    op('post', '/api/delete-product-cart', 'Giỏ hàng', 'Xóa một dòng giỏ hàng', data=FREE,
       request=body(input_fields({'productId': OID}), {'productId': ID}))
    op('post', '/api/update-info-cart', 'Giỏ hàng', 'Lưu thông tin nhận hàng kiểu cũ', data=FREE,
       request=body(obj({'fullName': text(), 'phone': text(), 'address': text(), 'note': text(), 'nameCoupon': OID}),
                    {'fullName': 'Nguyễn Văn An', 'phone': '0900000000', 'address': 'Địa chỉ thử nghiệm', 'note': ''}),
       description='Checkout COD/VNPay nhận thông tin trực tiếp ở create-payment. nameCoupon là ID document coupon, không phải tên mã hiển thị.')
    op('get', '/api/preferences', 'Lựa chọn tài khoản', 'Đọc yêu thích, bộ lọc và sổ địa chỉ', data=ref('Preferences'), errors=(401, 404, 500))
    op('patch', '/api/preferences', 'Lựa chọn tài khoản', 'Thay thế các danh sách được gửi trong body', data=ref('Preferences'),
       request=body(ref('PreferencesPatch'), {'wishlist': [ID]}), errors=(400, 401, 404, 500),
       description='PATCH từng field, nhưng giá trị mảng là thay toàn bộ mảng. Không nhận userId/role. wishlist tối đa 100, savedSearches 10, addresses 8; mảng rỗng để xóa danh sách.')

    for path, name, param in [('/api/shipping/provinces', 'Danh sách tỉnh/thành GHN', None),
                              ('/api/shipping/districts', 'Danh sách quận/huyện GHN', 'provinceId'),
                              ('/api/shipping/wards', 'Danh sách phường/xã GHN', 'districtId')]:
        op('get', path, 'Vận chuyển GHN', name, data=array(ref('Location')),
           params=[query(param, integer(minimum=1), True)] if param else [], errors=(400, 401, 429, 503, 500),
           rate='60 request/phút/IP chung cho /api/shipping.',
           description='Lấy ID địa phương từ phản hồi API, không tự đoán mã. Ward id trả string.')
    address = obj({'provinceId': integer(minimum=1), 'districtId': integer(minimum=1), 'wardCode': text(maxLength=20), 'street': text(maxLength=250)},
                  ['provinceId', 'districtId', 'wardCode', 'street'])
    quote_fields = {'cartId': OID, 'method': enum('COD VNPAY'), 'nameCoupon': OID, 'address': address}
    op('post', '/api/shipping/quote', 'Vận chuyển GHN', 'Tạo báo giá vận chuyển cho giỏ của mình', data=ref('ShippingQuote'),
       request=body(obj(quote_fields, ['cartId', 'method', 'address']),
           {'cartId': ID, 'method': 'COD', 'address': {'provinceId': 1, 'districtId': 1, 'wardCode': '<MA_PHUONG_THU>', 'street': 'Địa chỉ thử nghiệm'}}),
       errors=(400, 401, 403, 404, 409, 429, 502, 503, 500), rate='60 request/phút/IP chung cho shipping.',
       description='Có ghi quote DB, gọi GHN để tính cước nhưng chưa tạo vận đơn. Quote sống 10 phút, gắn user/cart/method/giá hàng/coupon/kiện/địa chỉ. COD khách trả phí; VNPay được hỗ trợ ceil(grossFee/2). Mã địa phương trong ví dụ chỉ là placeholder.')
    checkout_fields = {'cartId': OID, 'typePayment': enum('COD VNPAY'), 'shippingQuoteId': OID,
                       'fullName': text(maxLength=2000), 'phone': text(pattern=r'^0\d{9,10}$'),
                       'address': text('Số nhà/tên đường phải khớp street trong quote.', maxLength=2000),
                       'note': text(maxLength=2000), 'nameCoupon': OID}
    op('post', '/api/create-payment', 'Đơn hàng và thanh toán', 'Checkout COD hoặc tạo URL VNPay',
       data={'oneOf': [ref('Order'), text(format='uri')]},
       request=body(obj(checkout_fields, ['cartId', 'typePayment', 'shippingQuoteId', 'fullName', 'phone', 'address']),
                    {'cartId': ID, 'typePayment': 'COD', 'shippingQuoteId': '507f1f77bcf86cd799439014',
                     'fullName': 'Nguyễn Văn An', 'phone': '0900000000', 'address': 'Địa chỉ thử nghiệm', 'note': ''}),
       codes=(201,), errors=(400, 401, 403, 409, 503, 500),
       description='Body mô tả luồng tích hợp mới; legacy có thể lấy tên/địa chỉ từ giỏ. Không gửi price/totalPrice làm nguồn tính tiền. Thành công COD: metadata là Order; VNPay: metadata là string URL, không phải HTTP redirect. Giữ kho/coupon và xóa giỏ trong transaction. Gọi lại cùng cartId trả đơn/URL cũ nếu còn hợp lệ; cartId là khóa chống trùng. Đổi giá/quote cần xác nhận lại. Cần MongoDB replica set. MoMo hiện bị từ chối 400.')
    op('post', '/api/retry-payment-vnpay', 'Đơn hàng và thanh toán', 'Lấy lại URL hoặc mở lần thanh toán VNPay mới', data=text(format='uri'),
       request=body(input_fields({'idOrder': OID}), {'idOrder': ID}), errors=(400, 401, 409, 503, 500),
       description='Chỉ đơn VNPay pending của chủ, paymentStatus pending/failed/expired. Attempt pending chưa hết hạn trả URL cũ; failed/expired giữ lại nguồn lực và tạo transactionRef mới. Không áp dụng cho refund_required.')
    op('post', '/api/reconcile-payment-vnpay', 'Đơn hàng và thanh toán', 'Tra cứu kết quả VNPay khi thiếu IPN',
       data=obj({'paymentStatus': text(), 'nextCheckAt': {**TIME, 'nullable': True}}),
       request=body(input_fields({'idOrder': OID}), {'idOrder': ID}), errors=(400, 401, 404, 503, 500),
       description='Chủ đơn VNPay; một attempt được query tối đa mỗi 5 phút theo lease DB. Lỗi mạng/chưa xác minh không tự coi đã trả tiền. nextCheckAt hướng dẫn lúc kiểm tra tiếp.')
    for path, summary, name in [('/api/get-payment-success', 'Chi tiết đơn hàng của mình', 'idPayment')]:
        op('get', path, 'Đơn hàng và thanh toán', summary, data=ref('OrderView'), params=[query(name, OID, True, example=ID)],
           description='Tên route legacy không bảo đảm đơn đã paid; đọc paymentStatus. Không tìm thấy/không sở hữu hiện trả 403. Ưu tiên snapshot đơn; dữ liệu cũ có thể fallback sản phẩm hiện tại.')
    op('get', '/api/get-order-user', 'Đơn hàng và thanh toán', 'Lịch sử đơn của tài khoản', data=array(ref('OrderView')),
       description='Chỉ chủ tài khoản, sort createdAt giảm dần; chưa phân trang.')
    op('get', '/api/get-order-admin', 'Đơn hàng và thanh toán', 'Danh sách đơn cho admin, kèm các lần thanh toán', data=array(FREE),
       description='Trả documents đơn với products đã ghép snapshot và paymentAttempts; chưa phân trang.')
    op('post', '/api/cancel-order', 'Đơn hàng và thanh toán', 'Khách hủy đơn pending đủ điều kiện', data=FREE,
       request=body(input_fields({'idOrder': OID}), {'idOrder': ID}), errors=(400, 401, 404, 409, 503, 500),
       description='Chỉ đơn của mình. Chặn nếu đã vận chuyển/đang tạo vận đơn chưa hủy tại GHN hoặc đã thanh toán online cần hoàn tiền. Không có API hoàn tiền tự động.')
    op('post', '/api/update-order-status', 'Đơn hàng và thanh toán', 'Admin chuyển trạng thái đơn', data=FREE,
       request=body(input_fields({'idOrder': OID, 'status': enum('confirmed shipped delivered cancelled')}), {'idOrder': ID, 'status': 'confirmed'}),
       errors=(400, 401, 403, 404, 409, 503, 500),
       description='pending→confirmed/cancelled; confirmed→shipped/cancelled; shipped→delivered. Không mở lại delivered/cancelled. VNPay phải paid; shipped cần mã vận đơn GHN nếu đơn dùng GHN. COD delivered được đánh dấu paid. Gọi cùng trạng thái là no-op.')
    for suffix, summary in [('preview', 'Xem trước cước/kiện giao hàng'), ('create', 'Tạo vận đơn GHN'), ('sync', 'Đồng bộ vận đơn GHN theo mã')]:
        request = None if suffix == 'sync' else body(obj({'parcel': ref('Parcel'), **({'expectedFee': MONEY} if suffix == 'create' else {})},
            ['expectedFee'] if suffix == 'create' else []), {'expectedFee': 30000} if suffix == 'create' else {}, required=suffix == 'create')
        op('post', f'/api/shipping/admin/orders/{{id}}/{suffix}', 'Vận chuyển GHN', summary, data=FREE, request=request,
           errors=(400, 401, 403, 404, 409, 429, 502, 503, 500), rate='60 request/phút/IP chung cho shipping.',
           description={'preview': 'Đơn confirmed, đúng môi trường/shop; VNPay phải paid. parcel tùy chọn, bỏ qua để dùng kiện snapshot. Không tạo vận đơn.',
                        'create': 'expectedFee phải bằng grossFee vừa preview; nếu đổi cước trả 409. Ghi khóa tạo để chống trùng; trạng thái unknown/creating cần sync trước khi thử lại. COD thu hộ totalPrice; VNPay không thu hộ lần nữa.',
                        'sync': 'Gọi GHN bằng mã vận đơn hoặc client_order_code để khôi phục kết quả chưa rõ. Có cập nhật shipment DB; không có API hủy vận đơn GHN trong code này.'}[suffix])
    callback_params = [query(key, text(), key in ['vnp_TxnRef', 'vnp_Amount', 'vnp_TmnCode', 'vnp_ResponseCode',
        'vnp_TransactionStatus', 'vnp_TransactionNo', 'vnp_OrderInfo', 'vnp_SecureHash'],
        description='Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký.') for key in ['vnp_TxnRef', 'vnp_Amount', 'vnp_TmnCode',
        'vnp_ResponseCode', 'vnp_TransactionStatus', 'vnp_TransactionNo', 'vnp_OrderInfo', 'vnp_SecureHash', 'vnp_BankCode', 'vnp_PayDate', 'vnp_SecureHashType']]
    for path in ['/api/vnpay-return', '/api/check-payment-vnpay']:
        op('get', path, 'Callback nhà cung cấp', 'Return URL VNPay: xác minh và điều hướng', params=callback_params,
           responses={'302': {'description': 'Điều hướng /payments/{orderId}; production dùng origin frontend.', 'headers': {'Location': {'schema': text()}}}},
           errors=(400, 404, 503, 500), deprecated=path.endswith('check-payment-vnpay'),
           description='Nhà cung cấp gọi, không phải endpoint frontend tự ký. vnp_Amount bằng VND×100. Return không ghi paid; IPN/query đã xác minh mới ghi trạng thái. Có thể có thêm tham số vnp_* được đưa vào chữ ký; không thêm query không bắt đầu vnp_.')
    op('get', '/api/vnpay-ipn', 'Callback nhà cung cấp', 'IPN VNPay: xác minh và ghi nhận kết quả', params=callback_params,
       responses={'200': response(obj({'RspCode': text(), 'Message': text()}, ['RspCode', 'Message']),
           description='HTTP 200 không đồng nghĩa thanh toán thành công.', example={'RspCode': '00', 'Message': 'Confirm success'})}, errors=(),
       description='RspCode: 00 đã xử lý; 01 không tìm thấy/không khớp đơn; 02 đã xử lý; 04 sai tiền; 97 sai chữ ký/tham số; 99 lỗi xử lý. Thành công tài chính cần ResponseCode=00 và TransactionStatus=00, số tiền và reference khớp. Callback lặp không giữ/hoàn kho lần hai. Thành công muộn có thể ghi refund_required, không tự mở lại đơn.')
    op('get', '/api/check-payment-momo', 'Legacy chưa hỗ trợ', 'Callback MoMo legacy còn đăng ký', deprecated=True,
       responses={'302': {'description': 'Nhánh thành công legacy có thể điều hướng về chi tiết đơn.'}}, errors=(403, 500),
       caveat='Luồng tạo MoMo đã bị chặn, nhưng callback legacy vẫn còn và chưa có kiểm tra chữ ký tương đương VNPay. Không tích hợp/gọi thử endpoint này; đây không phải API thanh toán được hỗ trợ.',
       description='Được liệt kê để không bỏ sót route đang tồn tại. Không cung cấp mẫu callback thành công hay chữ ký giả. Xem code payments.controller.js:181 và ghi chú hiện trạng.')

    coupon_example = dict(nameCoupon='DEMO-COUPON', discount=50000, quantity=10, minPrice=1000000,
                          startDate='2026-11-02T00:00:00+07:00', endDate='2027-01-01T00:00:00+07:00')
    for path, summary in [('/api/create-coupon', 'Tạo coupon'), ('/api/update-coupon', 'Cập nhật coupon')]:
        creating = 'create' in path
        fields = copy.deepcopy(SCHEMAS['CouponInput'])
        example = dict(coupon_example)
        if not creating:
            fields['properties']['_id'] = OID
            fields['required'] = ['_id']
            example['_id'] = ID
        op('post', path, 'Coupon', summary, request=body(fields, example),
           responses={str(201 if creating else 200): response(ref('MessageOnly'))}, errors=(400, 401, 403, 500),
           description='discount là số tiền VND trừ trực tiếp, khác discount phần trăm của sản phẩm. nameCoupon ở giỏ/checkout là ID document. Create legacy đòi field truthy nên discount/quantity/minPrice=0 bị từ chối dù schema số cho phép 0; chưa enforce đầy đủ validation khi CRUD.')
    op('delete', '/api/delete-coupon', 'Coupon', 'Xóa coupon', params=[query('id', OID, True, example=ID)],
       responses={'200': response(ref('MessageOnly'))})
    op('get', '/api/coupons', 'Coupon', 'Danh sách coupon kiểu response riêng',
       responses={'200': response(obj({'success': {'type': 'boolean'}, 'coupons': array(ref('Coupon'))}, ['success', 'coupons']))},
       description='Route hiện public và chưa phân trang, không phải admin-only. Không có metadata envelope.')
    op('get', '/api/coupon', 'Legacy chưa hỗ trợ', 'Coupon theo giỏ: endpoint legacy đang lỗi', deprecated=True,
       responses={'500': response(ref('Error'))}, errors=(),
       caveat='Route không gắn authUser nhưng handler đọc req.user.id, nên không có req.user kể cả gửi cookie. Handler còn tham chiếu totalCartBefore không có trong cart schema. Dùng metadata.dataCoupon của GET /api/get-cart thay thế.',
       description='Không mô tả response 200 giả định cho endpoint hiện trạng này.')

    op('post', '/api/preorders', 'Đặt hàng theo yêu cầu', 'Gửi yêu cầu cung ứng sản phẩm hết hàng',
       data=obj({'id': OID, 'status': enum(PREORDER_STATUS), 'unitPrice': MONEY, 'totalPrice': MONEY}),
       request=body(ref('PreorderInput'), {'productId': ID, 'quantity': 1, 'fullName': 'Nguyễn Văn An', 'phone': '0900000000', 'consent': True, 'note': 'Nhờ tư vấn nguồn hàng.'}),
       codes=(201,), errors=(400, 401, 404, 409, 429, 500), rate='5 request/15 phút/IP.',
       description='Chủ lấy từ session, không nhận userId client. Cần published + allowPreorder=true + stock<=0. Giá lấy DB. Chưa tạo đơn bán, chưa thu tiền/giữ kho, không phải yêu cầu hậu mãi.')
    pre_params = [query('page', integer(minimum=1, maximum=100000, default=1)), query('limit', integer(minimum=1, maximum=100, default=20)), query('status', enum(PREORDER_STATUS))]
    for path, summary in [('/api/preorders', 'Admin xem tất cả yêu cầu'), ('/api/preorders/mine', 'Khách xem yêu cầu của mình')]:
        op('get', path, 'Đặt hàng theo yêu cầu', summary, data=ref('PreordersPage'), params=pre_params,
           description='Hồ sơ cũ thiếu userId không tự gán theo email/số điện thoại. Danh sách có lịch sử trạng thái và ghi chú xử lý công khai với chủ yêu cầu.')
    op('patch', '/api/preorders/{id}/status', 'Đặt hàng theo yêu cầu', 'Admin chuyển trạng thái và thêm ghi chú',
       data=obj({'id': OID, 'status': enum(PREORDER_STATUS)}),
       request=body(obj({'status': enum('contacted confirmed cancelled'), 'note': text(maxLength=1000)}, ['status']), {'status': 'contacted', 'note': 'Đã trao đổi nhu cầu với khách.'}),
       errors=(400, 401, 403, 404, 409, 500), description='pending→contacted/confirmed/cancelled; contacted→confirmed/cancelled. confirmed/cancelled kết thúc. Ghi chú được khách nhìn thấy; không ghi dữ liệu nội bộ.')
    op('post', '/api/create-preview-product', 'Đánh giá', 'Gửi đánh giá từ đơn đã nhận và thanh toán',
       data=obj({'id': OID, 'moderationStatus': enum('pending')}), codes=(201,),
       request=body(input_fields({'productId': OID, 'content': text(minLength=1, maxLength=2000), 'rating': integer(minimum=1, maximum=5)}),
                    {'productId': ID, 'content': 'Nội dung đánh giá thử nghiệm.', 'rating': 5}),
       errors=(400, 401, 403, 404, 409, 429, 500), rate='10 request/giờ/IP.',
       description='Tên route preview là legacy. Cần đơn thuộc user có sản phẩm, status=delivered, paymentStatus=paid. Một đánh giá mới/user/product; chờ duyệt trước công khai.')
    for path, summary in [('/api/reviews', 'Đọc đánh giá công khai'), ('/api/reviews/moderation', 'Admin đọc đánh giá pending')]:
        op('get', path, 'Đánh giá', summary, data=ref('ReviewsPage'),
           params=[query('productId', OID), query('page', integer(minimum=1, maximum=100000, default=1))],
           description='10 đánh giá/trang; productId lọc trước phân trang. Public gồm approved và legacy chưa có moderationStatus. Không trả email/userId; verifiedPurchase chỉ có khi gắn orderId.')
    op('get', '/api/get-preview-product-home', 'Đánh giá', 'Tối đa 10 đánh giá công khai mới nhất', data=array(ref('Review')))
    op('patch', '/api/reviews/{id}/status', 'Đánh giá', 'Admin duyệt hoặc từ chối đánh giá', data=obj({'id': OID, 'status': text()}),
       request=body(input_fields({'status': enum('approved rejected')}), {'status': 'approved'}), errors=(400, 401, 403, 404, 500))

    blog_fields = {'title': text(), 'content': text('HTML được sanitize.'), 'image': text()}
    for path, summary, creating in [('/api/blog/create', 'Tạo bài viết', True), ('/api/blog/update', 'Cập nhật bài viết', False)]:
        fields = dict(blog_fields, **({} if creating else {'id': OID}))
        example = dict(title='Bài viết minh họa', content='<p>Nội dung thử nghiệm.</p>', image='/uploads/blogs/fixture.png', **({} if creating else {'id': ID}))
        op('post', path, 'Blog', summary, data=ref('Blog'), request=body(obj(fields), example), codes=(201,) if creating else (200,),
           caveat='Async handler chưa có wrapper bắt lỗi Express 4. update trả document trước cập nhật, và nhánh không tìm thấy tham chiếu NotFoundError chưa import; không bảo đảm mọi lỗi có JSON chuẩn.')
    op('get', '/api/blog/get-all', 'Blog', 'Danh sách bài viết', data=array(ref('Blog')), description='Chưa phân trang; content được sanitize khi đọc.')
    op('get', '/api/blog/get-by-id', 'Blog', 'Chi tiết bài viết', data={**SCHEMAS['Blog'], 'nullable': True}, params=[query('id', OID, True, example=ID)],
       description='ID hợp lệ không tồn tại hiện có thể trả 200 metadata=null; không phải 404.')
    op('post', '/api/blog/delete', 'Blog', 'Xóa bài viết bằng POST', data=FREE, request=body(input_fields({'id': OID}), {'id': ID}))
    file_schema = text(format='binary')
    op('post', '/api/upload-image', 'Upload', 'Admin upload nhiều ảnh sản phẩm',
       request=body(input_fields({'images': array(file_schema)}), {'images': []}, 'multipart/form-data'),
       responses={'200': response(obj({'message': text(), 'images': array(text())}, ['message', 'images']))},
       caveat='Multer hiện chưa cấu hình giới hạn số file/kích thước/MIME tại route. Không suy diễn giới hạn an toàn từ schema tài liệu. Field phải là images; mỗi file là một part cùng tên.')
    op('post', '/api/blog/upload-image', 'Upload', 'Upload một ảnh blog', data=text(),
       request=body(input_fields({'image': file_schema}), {'image': ''}, 'multipart/form-data'),
       caveat='Route hiện public, chưa có authAdmin hoặc giới hạn upload tại Multer; không phải chính sách quyền mong muốn. Async handler chưa được bọc. Field image khác images của ảnh sản phẩm.')
    op('post', '/api/chatbot', 'Chatbot Gemini', 'Hỏi tư vấn đồng hồ',
       request=body(obj({'question': text(minLength=1, maxLength=1000),
                        'history': array(input_fields({'role': enum('user model'), 'text': text(minLength=1, maxLength=1000)}), maxItems=10)}, ['question']),
                    {'question': 'Tư vấn đồng hồ máy pin trong ngân sách 3 triệu đồng.'}),
       responses={'200': response(obj({'message': text(), 'statusCode': integer(), 'requestId': text(), 'metadata': text()}, ['message', 'statusCode', 'requestId', 'metadata']),
                                 example={'message': 'Chatbot response', 'statusCode': 200, 'requestId': 'fixture-request-id', 'metadata': 'Nội dung minh họa, không phải kết quả AI thực.'})},
       errors=(400, 401, 422, 429, 502, 503, 504, 500), rate='10 request/phút/IP.',
       description='metadata là text. Lỗi có errorCode: INVALID_INPUT, RATE_LIMIT, INVALID_KEY, MODEL_NOT_FOUND, TIMEOUT, QUOTA_429, UNAVAILABLE_5xx, NETWORK, BLOCKED_BY_SAFETY, EMPTY_RESPONSE, UNKNOWN. Timeout 30 giây/lần, tối đa 2 retry cho lỗi được phân loại; không stream. Context hiện tối đa 10 sản phẩm còn stock, chưa có retrieval RAG theo câu hỏi hoặc link sản phẩm.')
    for path, summary, fields, example in [('/api/message/create', 'Khách gửi tin nhắn cho admin đầu tiên', {'text': text()}, {'text': 'Nội dung hỗ trợ thử nghiệm.'}),
        ('/api/message/create-admin', 'Admin gửi tin cho khách', {'receiverId': OID, 'text': text()}, {'receiverId': ID, 'text': 'Phản hồi hỗ trợ thử nghiệm.'})]:
        op('post', path, 'Tin nhắn nhân viên', summary, data=ref('ChatMessage'), request=body(input_fields(fields), example), codes=(201,),
           description='Tin nhắn được lưu DB rồi phát sự kiện Socket.IO nếu người nhận online. Không có event socket gửi tin; dùng HTTP này. Cần có tài khoản admin và server Socket.IO đã khởi tạo.')
    op('get', '/api/message/all', 'Tin nhắn nhân viên', 'Admin đọc danh sách hội thoại gửi đến mình', data=array(FREE),
       description='Trả senderId, email, fullName, unreadMessage, latestMessage, latestAt, lastLoginAt, isOnline. Không phân trang; danh sách giới hạn các tin gửi đến admin đang đăng nhập.')
    op('get', '/api/message/get-message', 'Tin nhắn nhân viên', 'Admin đọc hội thoại giữa hai ID', data=array(ref('ChatMessage')),
       params=[query('senderId', OID, True, example=ID), query('receiverId', OID, True, example=ID)])
    op('get', '/api/message/get-message-user', 'Tin nhắn nhân viên', 'Khách đọc hội thoại của mình', data=array(ref('ChatMessage')),
       caveat='Handler lấy receiver từ tin đầu của user; khi chưa có tin nào có thể lỗi thay vì trả mảng rỗng.')
    op('get', '/api/message/read-message', 'Tin nhắn nhân viên', 'Đánh dấu hội thoại đã đọc', data=FREE,
       params=[query('receiverId', OID, True, example=ID)],
       description='GET có tác dụng ghi. Đánh dấu toàn bộ tin chưa đọc trong conversationId, không chỉ tin gửi đến người gọi.')


def sample(schema, depth=0):
    if '$ref' in schema:
        return sample(SCHEMAS[schema['$ref'].split('/')[-1]], depth)
    if 'example' in schema:
        return schema['example']
    if 'oneOf' in schema:
        return sample(schema['oneOf'][0], depth)
    if 'allOf' in schema:
        return sample(schema['allOf'][0], depth)
    if 'enum' in schema:
        return schema['enum'][0]
    if 'default' in schema:
        return schema['default']
    kind = schema.get('type')
    if kind == 'object':
        fields = list(dict.fromkeys(schema.get('required', []) + list(schema.get('properties', {}))[:8]))
        return {key: sample(schema['properties'][key], depth + 1) for key in fields} if depth < 5 else {}
    if kind == 'array':
        return []
    if kind in ['integer', 'number']:
        return max(schema.get('minimum', 0), 1)
    if kind == 'boolean':
        return False
    if schema.get('format') == 'date-time':
        return DATE
    if schema.get('format') == 'email':
        return 'khach@example.test'
    if schema.get('format') == 'uri':
        return 'https://example.test/minh-hoa'
    return 'minh_hoa'


def make_spec():
    rows = inventory()
    actual = {(row['method'], row['path']) for row in rows}
    assert actual == set(OPS), f'Route coverage mismatch. Missing={actual - set(OPS)}; extra={set(OPS) - actual}'
    assert len(rows) == len(actual), 'Duplicate route inventory'
    schemas = copy.deepcopy(SCHEMAS)
    tags = list(dict.fromkeys(config['tag'] for config in OPS.values()))
    spec = {'openapi': '3.0.3', 'info': {'title': 'ECOMMOR — API hiện trạng', 'version': '2026.11.02',
        'description': 'Tài liệu tiếng Việt đối chiếu source ngày 02/11/2026. 88 thao tác HTTP. Ví dụ hư cấu; không chứa secret hay dữ liệu khách. Cookie auth; không dùng Bearer. Các caveat mô tả hành vi đang có, không phải cam kết đã sửa.'},
        'servers': [{'url': 'http://localhost:3000', 'description': 'Backend trực tiếp khi phát triển'},
                    {'url': 'http://localhost:5173', 'description': 'Vite dev proxy /api và /uploads'}],
        'tags': [{'name': tag} for tag in tags], 'paths': {},
        'components': {'securitySchemes': {
            'sessionCookie': {'type': 'apiKey', 'in': 'cookie', 'name': 'token', 'description': 'JWT access cookie, 15 phút; user/admin dùng cùng cookie.'},
            'refreshCookie': {'type': 'apiKey', 'in': 'cookie', 'name': 'refreshToken', 'description': 'Refresh cookie sống 7 ngày.'},
            'resetCookie': {'type': 'apiKey', 'in': 'cookie', 'name': 'tokenResetPassword', 'description': 'Cookie chứng minh OTP reset, sống 5 phút.'}}, 'schemas': schemas}}
    sources = []
    for row in rows:
        key = row['method'], row['path']
        config = OPS[key]
        operation_id = row['method'] + ''.join(part[:1].upper() + part[1:] for part in re.findall('[A-Za-z0-9]+', row['path']))
        description = config['description']
        if row['auth'] != 'public':
            description += '\n\nQuyền middleware: ' + ('admin (isAdmin=true)' if row['auth'] == 'admin' else 'phiên đăng nhập') + '.'
        if config['rate']:
            description += '\n\nGiới hạn: ' + config['rate']
        if config['caveat']:
            description += '\n\nHiện trạng cần lưu ý: ' + config['caveat']
        security = config['security'] if config['security'] is not None else ([{'sessionCookie': []}] if row['auth'] != 'public' else [])
        responses = copy.deepcopy(config['responses']) if config['responses'] else {
            str(code): response(envelope(config['data']), example={'message': 'Thông báo minh họa từ server', 'statusCode': code, 'metadata': sample(config['data'])}) for code in config['codes']}
        errors = set(config['errors']) | ({401} if row['auth'] != 'public' else set())
        for code in sorted(errors):
            if str(code) not in responses:
                responses[str(code)] = response(ref('Error'), description={400: 'Dữ liệu không hợp lệ', 401: 'Phiên thiếu/sai/hết hạn',
                    403: 'Không đủ quyền hoặc lỗi nghiệp vụ legacy', 404: 'Không tìm thấy tài nguyên', 409: 'Xung đột trạng thái/giá/tồn',
                    422: 'Bị bộ lọc an toàn AI chặn', 429: 'Vượt giới hạn', 500: 'Lỗi hệ thống; một số legacy handler chưa bắt lỗi đầy đủ',
                    502: 'Lỗi nhà cung cấp/phản hồi không hợp lệ', 503: 'Cấu hình/dịch vụ/transaction chưa sẵn sàng', 504: 'Timeout nhà cung cấp'}.get(code, 'Lỗi'))
        parameters = copy.deepcopy(config['params'])
        for name in re.findall(r'\{([^}]+)\}', row['path']):
            parameters.insert(0, {'name': name, 'in': 'path', 'required': True,
                                  'schema': text(maxLength=100) if name == 'name' else OID})
        operation = {'operationId': operation_id, 'tags': [config['tag']], 'summary': config['summary'],
                     'description': description.strip(), 'security': security, 'parameters': parameters, 'responses': responses,
                     'x-route-auth': row['auth'], 'x-source': [row['source']] + ([config['evidence']] if config['evidence'] else [])}
        if config['request']:
            operation['requestBody'] = config['request']
        if config['deprecated']:
            operation['deprecated'] = True
        if config['caveat']:
            operation['x-runtime-caveat'] = config['caveat']
        spec['paths'].setdefault(row['path'], {})[row['method']] = operation
        sources.append(dict(operationId=operation_id, method=row['method'].upper(), path=row['path'],
                            auth=row['auth'], sources=operation['x-source'], deprecated=config['deprecated']))
    return spec, sources


def variable_for(key, path, location='body'):
    if key == 'id' or key == '_id':
        if '/shipping/' in path:
            return 'orderId'
        for needle, var in [('preorders', 'preorderId'), ('reviews', 'reviewId'), ('category', 'categoryId'),
                            ('coupon', 'couponId'), ('blog', 'blogId'), ('user', 'userId')]:
            if needle in path:
                return var
        return 'productId'
    if key == 'idOrder' or key == 'idPayment':
        return 'orderId'
    if key == 'productId' and 'preorders' in path:
        return 'preorderProductId'
    if key == 'name' and '/brands/' in path:
        return 'brandName'
    mapping = {'productId': 'productId', 'cartId': 'cartId', 'shippingQuoteId': 'quoteId', 'nameCoupon': 'couponId',
               'senderId': 'senderId', 'receiverId': 'receiverId', 'email': 'email', 'password': 'password',
               'confirmPassword': 'password', 'otp': 'otp', 'credential': 'googleIdToken',
               'provinceId': 'provinceId', 'districtId': 'districtId', 'wardCode': 'wardCode', 'expectedFee': 'expectedFee'}
    return mapping.get(key)


def make_postman(spec):
    folders, variables = {}, {'baseUrl': 'http://localhost:3000'}
    for path, methods in spec['paths'].items():
        for method, operation in methods.items():
            folder = operation['tags'][0]
            parameters = operation['parameters']
            url_path = path
            for parameter in parameters:
                if parameter['in'] == 'path':
                    var = variable_for(parameter['name'], path, 'path')
                    variables.setdefault(var, '')
                    url_path = url_path.replace('{' + parameter['name'] + '}', '{{' + var + '}}')
            qs = []
            for parameter in parameters:
                if parameter['in'] != 'query':
                    continue
                var = variable_for(parameter['name'], path, 'query')
                if var:
                    variables.setdefault(var, 0 if var in ['provinceId', 'districtId'] else '')
                    value = '{{' + var + '}}'
                else:
                    value = str(parameter.get('example', sample(parameter['schema'])))
                qs.append(dict(key=parameter['name'], value=value, disabled=not parameter['required'], description=parameter.get('description', '')))
            raw_url = '{{baseUrl}}' + url_path
            enabled = [item for item in qs if not item['disabled']]
            if enabled:
                raw_url += '?' + '&'.join(item['key'] + '=' + item['value'] for item in enabled)
            url = {'raw': raw_url, 'host': ['{{baseUrl}}'], 'path': url_path.lstrip('/').split('/')}
            if qs:
                url['query'] = qs
            request = {'method': method.upper(), 'header': [], 'url': url,
                       'description': operation['description'] + '\n\nNguồn: ' + ', '.join(operation['x-source'])}
            rb = operation.get('requestBody')
            if rb:
                content_type, content = next(iter(rb['content'].items()))
                if content_type == 'multipart/form-data':
                    properties = content['schema'].get('properties', {})
                    request['body'] = {'mode': 'formdata', 'formdata': [{'key': key, 'type': 'file', 'src': [],
                        'description': 'Chọn file fixture trên máy. Với images, có thể thêm nhiều part cùng tên.'} for key in properties]}
                else:
                    def replace(value):
                        if isinstance(value, dict):
                            return {key: ('{{' + var + '}}' if (var := variable_for(key, path)) else replace(item)) for key, item in value.items()}
                        if isinstance(value, list):
                            return [replace(item) for item in value]
                        return value
                    example = replace(content.get('example', {}))
                    raw = json.dumps(example, ensure_ascii=False, indent=2)
                    for var in re.findall(r'\{\{([^}]+)\}\}', raw):
                        variables.setdefault(var, 0 if var in ['provinceId', 'districtId', 'expectedFee'] else '')
                    for var in ['provinceId', 'districtId', 'expectedFee']:
                        raw = raw.replace('"{{' + var + '}}"', '{{' + var + '}}')
                    request['header'] = [{'key': 'Content-Type', 'value': content_type}]
                    request['body'] = {'mode': 'raw', 'raw': raw, 'options': {'raw': {'language': 'json'}}}
            item = {'name': method.upper() + ' ' + path + ' — ' + operation['summary'], 'request': request, 'response': []}
            for code, resp in operation['responses'].items():
                content = resp.get('content', {}).get('application/json', {})
                if 'example' in content:
                    item['response'].append({'name': 'Minh họa ' + code, 'originalRequest': copy.deepcopy(request),
                        'status': 'Minh họa, chưa gọi HTTP', 'code': int(code),
                        '_postman_previewlanguage': 'json', 'header': [{'key': 'Content-Type', 'value': 'application/json'}],
                        'body': json.dumps(content['example'], ensure_ascii=False, indent=2)})
            folders.setdefault(folder, []).append(item)
    collection = {'info': {'name': 'ECOMMOR — 88 API hiện trạng',
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        'description': 'Cookie jar tự giữ phiên sau login. Import environment mẫu; ID và thông tin xác thực để trống. Gọi từng request trên môi trường thử; không chạy toàn collection vì có tạo/xóa/thu tiền/gửi email. Không có script tự gửi request, tự cấp quyền hoặc tự ký callback.'},
        'item': [{'name': name, 'item': items} for name, items in folders.items()]}
    variables.update(email='', password='', otp='', googleIdToken='', productId='', preorderProductId='', cartId='', quoteId='', orderId='',
                     categoryId='', couponId='', userId='', blogId='', reviewId='', preorderId='', senderId='', receiverId='',
                     brandName='', provinceId=0, districtId=0, wardCode='', expectedFee=0)
    environment = {'name': 'ECOMMOR — local mẫu (không có secret)', '_postman_variable_scope': 'environment',
                   'values': [{'key': key, 'value': value, 'enabled': True, 'type': 'secret' if key in ['password', 'otp', 'googleIdToken'] else 'default'} for key, value in variables.items()]}
    return collection, environment


def describe_schema(schema):
    if '$ref' in schema:
        return schema['$ref'].split('/')[-1]
    if 'oneOf' in schema:
        return ' hoặc '.join(describe_schema(item) for item in schema['oneOf'])
    if 'allOf' in schema:
        return ' + '.join(describe_schema(item) for item in schema['allOf'])
    result = schema.get('type', 'object')
    if result == 'array':
        result += '<' + describe_schema(schema['items']) + '>'
    if schema.get('enum'):
        result += ': ' + ', '.join(str(item) for item in schema['enum'])
    return result + (' / null' if schema.get('nullable') else '')


def make_reference(spec):
    lines = ['# Tham chiếu 88 thao tác HTTP', '',
        'Sinh từ hợp đồng đã đọc code ngày 02/11/2026. Ví dụ là dữ liệu hư cấu, không phải log HTTP đã thu được. Đọc [README](README.md), [quy ước](conventions.md) và [luồng nghiệp vụ](workflows.md) trước khi gọi.', '',
        'Schema đầy đủ, giới hạn số/chuỗi, response và cookie security nằm trong [OpenAPI](openapi.json). Endpoint legacy/caveat giữ nguyên hành vi code, không mô tả như đã sửa.', '']
    grouped = {}
    for path, methods in spec['paths'].items():
        for method, operation in methods.items():
            grouped.setdefault(operation['tags'][0], []).append((path, method, operation))
    for tag, operations in grouped.items():
        lines += ['## ' + tag, '', '| Method | Path | Quyền middleware | Nội dung |', '| --- | --- | --- | --- |']
        for path, method, operation in operations:
            lines.append(f"| {method.upper()} | `{path}` | {operation['x-route-auth']} | [{operation['summary']}](#{operation['operationId'].lower()}) |")
        lines += ['']
        for path, method, operation in operations:
            lines += [f"<a id=\"{operation['operationId'].lower()}\"></a>", '', f'### {method.upper()} `{path}`', '', operation['summary'], '', operation['description'], '',
                      '**Nguồn:** ' + '; '.join(f'`{source}`' for source in operation['x-source']) + '.', '']
            if operation.get('deprecated'):
                lines += ['**Legacy/deprecated trong tài liệu:** không ưu tiên cho tích hợp mới.', '']
            lines += ['**Xác thực:** ' + (', '.join('/'.join(item) for item in operation['security']) if operation['security'] else 'Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint.') + '.', '']
            if operation['parameters']:
                lines += ['| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |', '| --- | --- | --- | --- | --- |']
                for p in operation['parameters']:
                    lines.append(f"| `{p['name']}` | {p['in']} | {'Có' if p['required'] else 'Không'} | {describe_schema(p['schema'])} | {p.get('description', '').replace('|', '/')} |")
                lines += ['']
            rb = operation.get('requestBody')
            if rb:
                media, content = next(iter(rb['content'].items()))
                schema = content['schema']
                if '$ref' in schema:
                    schema = SCHEMAS[schema['$ref'].split('/')[-1]]
                lines += [f"**Body:** `{media}`; {'bắt buộc' if rb['required'] else 'tùy chọn'}. Schema `{describe_schema(content['schema'])}`.", '']
                if schema.get('properties'):
                    lines += ['| Field | Bắt buộc | Kiểu | Ghi chú |', '| --- | --- | --- | --- |']
                    for key, field in schema['properties'].items():
                        lines.append(f"| `{key}` | {'Có' if key in schema.get('required', []) else 'Không'} | {describe_schema(field)} | {field.get('description', '').replace('|', '/')} |")
                    lines += ['']
                if media == 'application/json':
                    lines += ['Request minh họa:', '', '```json', json.dumps(content['example'], ensure_ascii=False, indent=2), '```', '']
                else:
                    lines += ['Chọn file fixture tại các field trên; không tự đặt Content-Type boundary khi dùng Postman/cURL.', '']
            lines += ['| HTTP | Response |', '| --- | --- |']
            for code, resp in operation['responses'].items():
                schema = resp.get('content', {}).get('application/json', {}).get('schema')
                lines.append(f"| {code} | {describe_schema(schema) if schema else resp['description']} |")
            examples = [resp['content']['application/json']['example'] for resp in operation['responses'].values()
                        if 'example' in resp.get('content', {}).get('application/json', {})]
            if examples:
                lines += ['', 'Response minh họa:', '', '```json', json.dumps(examples[0], ensure_ascii=False, indent=2), '```']
            lines += ['', '---', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='So sánh artifact với code/hợp đồng; không ghi file.')
    args = parser.parse_args()
    register_operations()
    spec, sources = make_spec()
    collection, environment = make_postman(spec)
    payloads = {'openapi.json': spec, 'postman_collection.json': collection,
                'postman_environment.json': environment, 'source-map.json': sources}
    contents = {name: json.dumps(data, ensure_ascii=False, indent=2) + '\n' for name, data in payloads.items()}
    contents['reference.md'] = make_reference(spec)
    stale = []
    for name, content in contents.items():
        path = HERE / name
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8') != content:
                stale.append(name)
        else:
            path.write_text(content, encoding='utf-8')
    assert not stale, 'Artifact chưa đồng bộ: ' + ', '.join(stale)
    print(('CHECK OK' if args.check else 'GENERATED'), len(sources), 'HTTP operations;', len(spec['paths']), 'paths;', len(SCHEMAS), 'shared schemas')
    print('Roles:', dict(Counter(row['auth'] for row in sources)))


if __name__ == '__main__':
    main()
