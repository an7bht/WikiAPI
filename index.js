const express = require('express');
const fetch = require('fetch');

const app = express();
const PORT = 3000;

// Middleware để xử lý CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Định nghĩa tuyến đường để chuyển tiếp yêu cầu từ máy chủ của bạn đến Wikimedia API
app.get('/content', async (req, res) => {
    try {
        const response = await fetch('https://en.wikipedia.org/w/api.php');
        const data = await response.json();
        res.json(data);
        // Lấy nội dung từ Wikimedia API bằng phương thức POST
fetch('https://en.wikipedia.org/w/api.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
        'action': 'parse',
        'page': 'Scholarship',
        'format': 'json'
    })
})
.then(response => response.json())
.then(data => {
    // Trích xuất nội dung từ phản hồi của Wikimedia API
    const parsedContent = data.parse.text['*'];
    console.log("Nội dung content: "+parsedContent);

    // // Gửi nội dung đã lấy được lên WordPress
    // fetch('https://your-wordpress-site.com/wp-json/wp/v2/posts', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         // Thay thế 'username' và 'password' bằng thông tin đăng nhập của bạn
    //         'Authorization': 'Basic ' + btoa('username:password')
    //     },
    //     body: JSON.stringify({
    //         title: 'New Post Title',
    //         content: parsedContent,
    //         status: 'publish'
    //     })
    // })
    // .then(response => {
    //     if (response.ok) {
    //         console.log('Bài đăng mới đã được tạo thành công trên WordPress!');
    //     } else {
    //         console.error('Đã có lỗi xảy ra:', response.statusText);
    //     }
    // })
    // .catch(error => console.error('Đã có lỗi xảy ra:', error));
})
.catch(error => console.error('Đã có lỗi xảy ra khi lấy dữ liệu từ Wikimedia API:', error));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Khởi động máy chủ
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
