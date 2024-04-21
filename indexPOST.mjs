import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
const port = process.env.PORT || 3000;

// Middleware cho phép CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Tuyến đường để xử lý yêu cầu
app.get('/content', async (req, res) => {
    try {
        // Lấy thông tin từ query parameters
        const { url_key, username, password, url_web } = req.query;
        
        // Kiểm tra và xử lý chuyển hướng URL
        const redirectionResult = await checkRedirection(url_key);
        const { domain, title } = redirectionResult.redirected ? parseURL(redirectionResult.redirectedUrl) : parseURL(url_key);

        // Sử dụng Promise.all() để thực hiện fetch dữ liệu và xử lý nhanh hơn
        const [pageId, content] = await Promise.all([
            getWikipediaPageId(domain, title),
            getContentFromPageID(domain, title)
        ]);

        // Gửi dữ liệu đến WordPress
        await postWordpress(content.title, content.content, username, password, url_web);

        // Trả về phản hồi JSON khi hoàn thành
        res.json({ status: "ok", text: "Đã đăng bài: "+title });
    } catch (error) {
        // Nếu lỗi xảy ra và status server trả về là 500, trả về thông báo lỗi và URL key tiếp theo
        res.json({ status: "error", error: error.message, text:"nexturl" });
        // if (error.response && error.response.status === 500) {
           
        // } else {
        //     // Xử lý lỗi khác và trả về phản hồi lỗi
        //     console.error('Đã có lỗi xảy ra:', error);
        //     res.status(500).json({ status: "error", error: error.message });
        // }
    }
});

// Hàm kiểm tra và xử lý chuyển hướng URL
async function checkRedirection(url) {
    try {
        const response = await axios.head(url, { maxRedirects: 0 });
        return {
            redirected: response.headers['location'] !== undefined,
            redirectedUrl: response.headers['location']
        };
    } catch (error) {
        if (error.response.status >= 300 && error.response.status < 400) {
            return {
                redirected: true,
                redirectedUrl: error.response.headers['location']
            };
        } else {
            throw error;
        }
    }
}

// Hàm phân tích URL để lấy domain và title
function parseURL(url) {
    const urlObject = new URL(url);
    const domain = urlObject.hostname;
    const pathSegments = urlObject.pathname.split('/');
    const title = pathSegments[pathSegments.length - 1];
    return { domain, title };
}

// Hàm lấy pageId từ Wikipedia API
async function getWikipediaPageId(domain, title) {
    const url = `https://${domain}/w/api.php?action=query&format=json&titles=${title}`;
    const response = await fetch(url);
    const data = await response.json();
    const pages = data.query.pages;
    for (const key in pages) {
        if (Object.hasOwnProperty.call(pages, key)) {
            const page = pages[key];
            if (page.pageid !== undefined && page.pageid !== -1) {
                return page.pageid;
            }
        }
    }
    throw new Error("Không tìm thấy 'pageid'");
}

// Hàm lấy nội dung từ pageID của Wikipedia
async function getContentFromPageID(domain, title) {
    const pageId = await getWikipediaPageId(domain, title);
    const response = await fetch(`https://${domain}/w/api.php?action=parse&pageid=${pageId}&formatversion=2&format=json`);
    const data = await response.json();
    const pageTitle = data.parse.title; // Lấy tiêu đề từ dữ liệu
    const $ = cheerio.load(data.parse.text);
    $('.navbox').remove();
    return { title: pageTitle, content: $.html() }; // Trả về cả tiêu đề và nội dung
}

// Hàm gửi dữ liệu đến WordPress
async function postWordpress(title, content, username, password, url_web) {
    const credentials = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');
    const wordpressURL = `https://${url_web}/wp-json/wp/v2/posts`;
    const newPostData = {
        title,
        content,
        status: 'publish'
    };
    const headers = { 'Authorization': `Basic ${credentials}` };
    await axios.post(wordpressURL, newPostData, { headers });
}

// Lắng nghe cổng và bắt đầu server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
