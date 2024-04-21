import express from 'express';
import fs from 'fs';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;
// Middleware cho phép CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Thông tin xác thực
const username = 'wikia';
const password = 'C(^1g(zZ9yU!uuopBF7EAZtB';
const auth = Buffer.from(`${username}:${password}`).toString('base64');
const headers = {
    'Authorization': `Basic ${auth}`
};

// Tạo một tuyến đường mới để lấy tất cả các URL từ WordPress REST API
app.get('/getAllUrl', async (req, res) => {
    try {
        const urls = await getAllURLs();
        res.json({ status: "ok", urls });
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

// Hàm lấy tất cả các URL từ WordPress REST API
async function getAllURLs() {
    const totalPosts = await axios.get('https://wiki.retik.live/wp-json/wp/v2/posts', { headers });
    const totalPages = Math.ceil(totalPosts.headers['x-wp-total'] / totalPosts.headers['x-wp-totalpages']);

    let allURLs = [];

    for (let page = 1; page <= totalPages; page++) {
        const response = await axios.get(`https://wiki.retik.live/wp-json/wp/v2/posts?page=${page}`, { headers });
        const posts = response.data;
        const urls = posts.map(post => post.link);
        allURLs = allURLs.concat(urls);
    }

    return allURLs;
}

// Lắng nghe cổng và bắt đầu server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
