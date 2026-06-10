# Job Application Tracker

Ứng dụng web tĩnh (HTML/CSS/JS thuần) để theo dõi đơn ứng tuyển, phỏng vấn và đối chiếu CV với JD.
Mở trực tiếp `index.html` trong trình duyệt — không cần cài đặt, không cần server.

## Đăng nhập

- **Lần đầu sử dụng:** màn hình sẽ yêu cầu **tạo tài khoản** (tên đăng nhập + mật khẩu, tối thiểu 6 ký tự).
- **Các lần sau:** phải **đăng nhập** đúng tài khoản mới vào được ứng dụng.
- Phiên đăng nhập giữ trong suốt phiên trình duyệt (`sessionStorage`); đóng trình duyệt → mở lại phải đăng nhập lại.
- Nút **🔒 Đăng xuất** nằm góc trên bên phải header.

Mật khẩu **không bao giờ lưu dạng văn bản thường** — chỉ lưu mã băm `SHA-256` cùng một `salt` ngẫu nhiên trong `localStorage` (khóa `job_tracker_auth`).

## Quên / đặt lại mật khẩu

Mật khẩu không thể khôi phục. Để đặt lại, mở **DevTools → Console** trên trang và chạy:

```js
localStorage.removeItem('job_tracker_auth');   // xóa tài khoản hiện tại
location.reload();                              // tải lại → quay về màn hình tạo tài khoản
```

> Lưu ý: thao tác này chỉ xóa tài khoản, **không** xóa dữ liệu đơn ứng tuyển
> (`job_tracker_applications`) hay CV versions (`job_tracker_cv_versions`).

## ⚠️ Giới hạn bảo mật — đọc kỹ

Đây là **lớp bảo vệ phía client** để giữ riêng tư trên máy dùng chung, **không phải bảo mật cấp server**:

- Toàn bộ dữ liệu nằm trong `localStorage` của trình duyệt — ai có quyền truy cập máy + DevTools đều có thể đọc/xóa dữ liệu hoặc gỡ tài khoản.
- Không có mã hóa dữ liệu đơn ứng tuyển; chỉ mật khẩu được băm.
- Nếu cần bảo mật thật (nhiều người dùng, dữ liệu nhạy cảm, truy cập qua internet), cần một **backend thực** (server xác thực + cơ sở dữ liệu). Cấu trúc tĩnh hiện tại không đáp ứng được điều đó.
