import express from 'express';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Thông tin xác thực
const username = 'wikia';
const password = 'C(^1g(zZ9yU!uuopBF7EAZtB';
const auth = Buffer.from(`${username}:${password}`).toString('base64');
const headers = {
    'Authorization': `Basic ${auth}`
};

// Tạo tuyến đường GET "/getAllUrl"
app.get('/getAllUrl', async (req, res) => {
    try {
        let allUrls = [];

        // Bắt đầu từ trang đầu tiên
        let page = 1;

        while (true) {
            // Gửi yêu cầu để lấy dữ liệu từ trang hiện tại
            const response = await axios.get(`https://wiki.retik.live/wp-json/wp/v2/posts?page=${page}`, { headers });
            const posts = response.data;

            // Trích xuất URL từ các bài viết và thêm vào mảng allUrls
            posts.forEach(post => {
                allUrls.push(post.link);
            });

            // Nếu không còn trang nào nữa, dừng vòng lặp
            if (posts.length === 0) {
                break;
            }

            // Tăng số trang lên 1 để lấy trang tiếp theo
            page++;
        }

        res.json({ status: 'success', urls: allUrls });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// Lắng nghe cổng và bắt đầu server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
