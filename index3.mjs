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
    const srsearch = req.query.srsearch;
    const username = req.query.username;
    const password = req.query.password;
    const url_web = req.query.url_web;

    try {
        var allTitles = [];
        let currentIndex = 0;
        let bienDem = 0;
        let bienDemS = 0;

        async function getAllPageTitles() {
            const url = "https://fr.wikipedia.org/w/api.php";

            // Tham số truy vấn
            const params = {
                action: "query",
                format: "json",
                list: "search",
                //formatversion: "2",
                srsearch: srsearch
            };


            let continueParam = null;

            // Hàm lấy tiêu đề từ danh sách
            async function fetchNextTitle() {
                let queryParams = new URLSearchParams(params);
                if (continueParam) {
                    queryParams.set('apcontinue', continueParam);
                }

                const response = await fetch(`${url}?${queryParams}`);
                const data = await response.json();

                if (data.query && data.query.search) {
                    const pages = data.query.search;
                    for(let i = 0; i< pages.length; i++){
                        allTitles.push(pages[i].pageid);
                    }
                    // for (const page of pages) {
                        
                    // }
                }

                if (data.continue) {
                    continueParam = data.continue.apcontinue;
                    console.log("Start: " + currentIndex);
                } else {
                    clearInterval(interval); // Dừng interval nếu không có trang nào nữa

                }
            }

            // Hàm lấy tiêu đề mỗi 5 giây
            async function fetchTitleEvery5Seconds() {
                console.log(allTitles.length)
                if (currentIndex < allTitles.length) {
               
                    getContentFromPageID(allTitles[currentIndex++]); 
                } 
                else {
                    await fetchNextTitle(); // Lấy thêm tiêu đề nếu đã hết danh sách
                }
                if (currentIndex < allTitles.length) {
                    
                    setTimeout(fetchTitleEvery5Seconds, 200); // Gọi lại hàm sau 5 giây
                }
            }

            // Bắt đầu lấy tiêu đề
            await fetchTitleEvery5Seconds();
        }

        getAllPageTitles();




        // ---------------------    Gửi yêu cầu POST đến Wikimedia API để lấy nội dung   ----------------------------------//
        async function getContentFromPageID(id) {
            fetch('https://fr.wikipedia.org/w/api.php?action=parse&pageid=' + id + '&format=json')
                .then(response => {
                    if (!response.ok) {
                        
                        throw new Error('Network response was not ok');
                        
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.parse.langlinks.length > 0) {
                        bienDemS++;
                        console.log(data.parse.title)
                        PostWordpress(data.parse.title, data.parse.text["*"], username, password);
                    }

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
                title: "TEST" + title,
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
            console.log('New post created:' + bienDem +"; "+ bienDemS);
            // So sánh "bienDem = bienDemS" thì hoàn thành xong 1 keyword
            if(bienDem == bienDemS){
                console.log("Đã xong 1 key");
                SendClient();
                
            }
            //console.log(createPostResponse.data.id);
            

        }
        function SendClient(){
            res.json({status:"ok", text: "Đã đăng: "+ bienDem + " bài"})
        }
        
    } catch (error) {
        console.error('Đã có lỗi xảy ra:', error);
    }


});

// Khởi động máy chủ
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
