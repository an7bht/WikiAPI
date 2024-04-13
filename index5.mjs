import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
const port = process.env.PORT || 3000;

// Middleware để xử lý CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Định nghĩa tuyến đường để chuyển tiếp yêu cầu từ máy chủ của bạn đến Wikimedia API
app.get('/content', async (req, res) => {
    const url_key = req.query.url_key;
    const username = req.query.username;
    const password = req.query.password;
    const url_web = req.query.url_web;

    try {
        let bienDem = 0;
        let bienDemS = 0;

        // ---- Kiểm tra xem url có chuyển hướng hay không -------//
        async function checkRedirection(url) {
            try {
                const response = await axios.head(url, { maxRedirects: 0 });
                // Check if response has a 'location' header indicating redirection
                if (response.headers['location']) {
                    return {
                        redirected: true,
                        redirectedUrl: response.headers['location']
                    };
                } else {
                    return {
                        redirected: false,
                        redirectedUrl: null
                    };
                }
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

        // -------- Lấy kết quả URL mới đã chuyển hướng ---------//
        checkRedirection(url_key)
            .then(result => {
                if (result.redirected) {
                    console.log("Domain: "+result.redirectedUrl.split('/')[2] + "; Titile: "+result.redirectedUrl.split('/')[4]);
                    getWikipediaTitle(result.redirectedUrl.split('/')[2], result.redirectedUrl.split('/')[4]);
                } else {
                    console.log("Domain: "+url_key.split('/')[2] + "; Titile: "+url_key.split('/')[4]);
                    getWikipediaTitle(url_key.split('/')[2], url_key.split('/')[4]);
                }
            })
            .catch(error => {
                console.error('Lỗi:', error.message);
            });

        function getWikipediaTitle(domain,title) {
            // Xây dựng URL cho yêu cầu API của Wikipedia
            const url = "https://"+domain+"/w/api.php?action=query&format=json&titles="+title;

            // Gửi yêu cầu GET đến API của Wikipedia sử dụng Fetch API
            fetch(url)
                .then(response => {
                    // Kiểm tra xem yêu cầu có thành công không
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    // Trả về dữ liệu JSON nếu yêu cầu thành công
                    return response.json();
                })
                .then(data => {
                    if (data.query && data.query.pages) {
                        const pages = data.query.pages;
                        for (const key in pages) {
                            if (Object.hasOwnProperty.call(pages, key)) {
                                const page = pages[key];
                                if (page.pageid !== undefined && page.pageid !== -1) {
                                    console.log(`Tìm thấy pageid: ${page.pageid}`);
                                    getContentFromPageID(domain, page.pageid);
                                    //break;
                                }
                            }
                        }
                    } else {
                        console.log("Không tìm thấy 'pageid'");
                    }
                })
                .catch(error => {
                    // Xử lý lỗi ở đây
                    console.error('There has been a problem with your fetch operation:', error);
                });
        }

        // ---------------------    Gửi yêu cầu POST đến Wikimedia API để lấy nội dung   ----------------------------------//

        async function getContentFromPageID(domain, id) {
            fetch("https://"+domain+"/w/api.php?action=parse&pageid=" + id + "&formatversion=2&format=json")
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // if (data.parse.langlinks.length > 0) {

                    // }

                    bienDemS++;
                    // Load HTML with cheerio
                    const $ = cheerio.load(data.parse.text + "");

                    // Remove elements with class "navbox"
                    $('.navbox').remove();

                    // Remove href
                    // $('a[href]').removeAttr('href');

                    // Get the modified HTML
                    const newHtmlString = $.html();

                    // console.log(data.parse.title)
                    PostWordpress(data.parse.title, newHtmlString, username, password);
                })
                .catch(error => {
                    console.error('There was a problem with the fetch operation:', error);
                });
        }

        // ------------------------------------------ WORDPRESS --------------------------------------------------------//

        async function PostWordpress(title, content, username, password) {
            // Thông tin đăng nhập WordPress
            const credentials = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

            // Thông tin trang web WordPress
            const wordpressURL = 'https://' + url_web;
            const restAPIPath = '/wp-json/wp/v2/posts';
            // Dữ liệu cho bài viết mới
            const newPostData = {
                title: title,
                content: content,
                status: 'publish', // Trạng thái bài viết: publish, draft, pending, private
            };
            const headers = {
                'Authorization': `Basic ${credentials}`
            };

            // Gửi yêu cầu tạo bài viết mới
            const createPostResponse = await axios.post(`${wordpressURL}${restAPIPath}`, newPostData, {
                headers
            });

            bienDem++
            console.log('New post created:' + bienDem + "; " + bienDemS);
            // So sánh "bienDem = bienDemS" thì hoàn thành xong 1 keyword
            if (bienDem == bienDemS) {
                console.log("Đã xong 1 key");
                SendClient();

            }
        }

        function SendClient() {
            res.json({ status: "ok", text: "Đã đăng: " + bienDem + " bài" })
        }

    } catch (error) {
        console.error('Đã có lỗi xảy ra:', error);
    }
});

// Khởi động máy chủ
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
