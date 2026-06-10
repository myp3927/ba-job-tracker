# Job Application Tracker

Ứng dụng web theo dõi đơn ứng tuyển, phỏng vấn và đối chiếu CV với JD.
Giao diện là web tĩnh (HTML/CSS/JS thuần), dữ liệu lưu trên **Firebase Cloud**.

Live: https://myp3927.github.io/ba-job-tracker/

## Đăng nhập

- **Đăng nhập bằng Google** (1 chạm) hoặc **Email + Mật khẩu**.
- Mỗi người dùng có dữ liệu riêng, lưu trên cloud → đăng nhập máy nào cũng thấy.
- Nút **🔒 Đăng xuất** ở góc trên bên phải.

## Phân quyền

- **Người dùng thường:** chỉ thấy đơn ứng tuyển của chính mình.
- **Admin** (email trong `ADMIN_EMAILS` ở `app.js`): thấy thêm tab **🛡️ Quản trị** để xem dữ liệu của tất cả người dùng.
- Quyền được thực thi bằng **Firestore Security Rules** (phía server), không phải chỉ ẩn/hiện trên giao diện.

## Cấu trúc Firebase

- **Authentication:** Email/Password + Google.
- **Firestore collections:**
  - `users/{uid}` — `{ email, displayName, lastLogin }`
  - `applications/{appId}` — `{ ownerUid, ownerEmail, company, position, platform, status, dateApplied, ... }`
- Cấu hình `firebaseConfig` nằm ở đầu `app.js` (an toàn để công khai — bảo mật nằm ở Security Rules).
- Security Rules: xem `firestore.rules`.

## Thiết lập lại / chuyển sang Firebase project khác

1. Sửa `firebaseConfig` ở đầu `app.js`.
2. Sửa danh sách admin: `ADMIN_EMAILS` trong `app.js` **và** mảng email trong `firestore.rules`.
3. Dán nội dung `firestore.rules` vào Firebase Console → Firestore → tab **Rules** → **Publish**.
4. Thêm domain (vd `myp3927.github.io`) vào Authentication → **Settings** → **Authorized domains**.

## Tính năng khác

- **CV vs JD Matcher** (tab 2): đối chiếu CV với JD bằng AI. API key của AI lưu cục bộ trên trình duyệt (không lên cloud — vì là khoá bí mật).
- **Export / Import** JSON cho dữ liệu đơn ứng tuyển.
