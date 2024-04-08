import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Middleware để xử lý CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Định nghĩa tuyến đường để chuyển tiếp yêu cầu từ máy chủ của bạn đến Wikimedia API
app.get('/content', async (req, res) => {
    try {

        async function getAllPageTitles() {
            const url = "https://en.wikipedia.org/w/api.php";

            // Tham số truy vấn
            const params = {
                action: "query",
                format: "json",
                list: "allpages",
                aplimit: "500",
                apfrom: "dog"  // Số lượng trang mỗi yêu cầu (giới hạn tối đa)
            };

            let allTitles = [];
            let continueParam = null;
            let currentIndex = 0;

            // Hàm lấy tiêu đề từ danh sách
            async function fetchNextTitle() {
                let queryParams = new URLSearchParams(params);
                if (continueParam) {
                    queryParams.set('apcontinue', continueParam);
                }

                const response = await fetch(`${url}?${queryParams}`);
                const data = await response.json();

                if (data.query && data.query.allpages) {
                    const pages = data.query.allpages;
                    for (const page of pages) {
                        allTitles.push(page.pageid);
                    }
                }

                if (data.continue) {
                    continueParam = data.continue.apcontinue;
                } else {
                    clearInterval(interval); // Dừng interval nếu không có trang nào nữa

                }
            }

            // Hàm lấy tiêu đề mỗi 5 giây
            async function fetchTitleEvery5Seconds() {
                if (currentIndex < allTitles.length) {
                    //console.log("Title:", allTitles[currentIndex++]);
                    getContentFromPageID(allTitles[currentIndex++]);
                } else {
                    await fetchNextTitle(); // Lấy thêm tiêu đề nếu đã hết danh sách
                }

                if (currentIndex < allTitles.length) {
                    setTimeout(fetchTitleEvery5Seconds, 50); // Gọi lại hàm sau 5 giây
                }
            }

            // Bắt đầu lấy tiêu đề
            await fetchTitleEvery5Seconds();
        }

        //getAllPageTitles();




        // ---------------------    Gửi yêu cầu POST đến Wikimedia API để lấy nội dung   ----------------------------------//
        function getContentFromPageID(id) {

            fetch('https://en.wikipedia.org/w/api.php?action=parse&pageid=' + id + '&format=json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {

                    if (data.parse.langlinks.length > 0) {

                    }
                })
                .catch(error => {
                    console.error('There was a problem with the fetch operation:', error);
                });
        }


        // ------------------------------------------ WORDPRESS --------------------------------------------------------//

         // Thông tin đăng nhập WordPress
         const username = 'an123456';
         const password = 'an@123456';
         const credentials = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

        // Thông tin trang web WordPress
        const wordpressURL = 'https://wiki.bkafoods.com';
        const restAPIPath = '/wp-json/wp/v2/posts';
        // Dữ liệu cho bài viết mới
        const newPostData = {
            title: 'Học bổng',
            content: "",
            status: 'publish', // Trạng thái bài viết: publish, draft, pending, private
        };
        const headers = {
            'Authorization': `Basic ${credentials}`
        };

        // Gửi yêu cầu tạo bài viết mới
        const createPostResponse = await axios.post(`${wordpressURL}${restAPIPath}`, newPostData, {
            headers
        });

        console.log('New post created:');
        console.log(createPostResponse.data);



    } catch (error) {
        console.error('Đã có lỗi xảy ra:', error);
    }
});

// Khởi động máy chủ
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
