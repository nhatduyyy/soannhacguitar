# Guitar Song Editor — V3 (để trống khi tạo bài mới)

Kích hoạt Gemini AI

Website soạn giáo án guitar theo **form BALLAD_24.docx**: khổ A4, font Montserrat; tiêu đề 20 pt, lời 16 pt, hợp âm `[Am]` màu đỏ đậm, ký hiệu cách chơi 12 pt nghiêng. Form và thư viện gồm Valse, Ballad, Boston, Bolero, Slowrock.

## Quy trình sử dụng

1. **Mở website:** các ô *Tên bài hát, Tác giả, Tone, Nội dung bài hát* và trang A4 đều để trống. Không tự đổ bài mẫu. Điệu và cách chơi mặc định chỉ là tùy chọn trong danh sách.
2. **Chọn ảnh:** ở khu vực **Thêm ảnh theo thứ tự**, có thể thêm nhiều ảnh PNG/JPG/WEBP (tối đa 8 MB mỗi ảnh). Các ảnh được đánh số 1, 2, 3…; dùng nút **↑**, **↓**, **×** để đổi thứ tự hoặc xóa ảnh. Thêm ảnh không tự làm thay đổi ô lời bài hát.
3. **Nhấn “Nhận dạng tất cả ảnh theo thứ tự”**: website gửi tuần tự từng ảnh lên chức năng AI trên Cloudflare Pages; chỉ khi **tất cả ảnh thành công** mới đưa lời + hợp âm vào ô **Nội dung bài hát** và ký hiệu cách chơi vào bản soạn A4. Nếu một ảnh lỗi, không ghi đè bài đang có.
4. **Chỉnh sửa:** sửa lời/hợp âm trong ô nhập và nhấn **Cập nhật bản soạn**, kéo ký hiệu ở bản A4 hoặc thêm/xóa nốt. **Ctrl+Z** hoàn tác, **Ctrl+Shift+Z** làm lại; cũng có nút trên thanh công cụ. Lịch sử áp dụng cho các chỉnh sửa bài soạn, không áp dụng cho việc chọn file ảnh.
5. **Xuất Word:** tải file `.docx` hoặc In/PDF. Font Montserrat cần được cài trên máy mở Word để không bị thay font.

**Ghi chú:** Danh sách ảnh chưa được lưu cùng bản nháp, chỉ nội dung lời và vị trí gắn ký hiệu được lưu trong trình duyệt. Để tạo bài trống mới, dùng **Bài mới / Xóa nội dung**. File Word mẫu chỉ dùng làm tiêu chuẩn định dạng, không hiện trong nội dung mới.

## Cài đặt AI trên Cloudflare Pages

1. Upload toàn bộ `index.html`, `functions/api/analyze.js`, `README.md` lên GitHub repo của bạn.
2. Tạo Cloudflare Pages với Build command để trống, Build output directory là `.`.
3. Tạo key Gemini API tại https://aistudio.google.com/apikey, rồi thêm secret **`GEMINI_API_KEY`** trong cài đặt biến bí mật của Cloudflare Pages (Production; Preview nếu cần). **Không đưa API key vào mã HTML / GitHub.**
4. Deploy lại. Nút nhận dạng sẽ gọi endpoint `/api/analyze` phía máy chủ để gửi ảnh cho Gemini. Có thể thêm secret/biến `GEMINI_MODEL` để chọn model API mà tài khoản cho phép. Mặc định trong mã đang là `gemini-3.6-flash`; nếu không khả dụng, hãy cấu hình model khác được API key hỗ trợ.

**Giới hạn:** AI đọc từ ảnh không đảm bảo 100% đúng tiếng Việt, hợp âm, nhịp và vị trí ký hiệu. Kiểm tra ảnh đối chiếu trước khi xuất. Nếu mở riêng `index.html` trên máy mà không triển khai function và API key, bạn vẫn soạn thủ công nhưng nút AI không hoạt động.
