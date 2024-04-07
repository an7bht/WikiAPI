const axios = require('axios');
const cheerio = require('cheerio');

// URL của trang web bạn muốn craw
const url = 'https://likeanimalslife.com/?p=10377';

// Sử dụng Axios để lấy nội dung của trang web
axios.get(url)
  .then(response => {
    // Load nội dung HTML vào Cheerio
    const $ = cheerio.load(response.data);

    // Trích xuất nội dung của các phần tử có class cụ thể
    const title = $('h1.entry-title').text().trim();
    const content = $('.entry-content').html().trim();
     // Lọc nội dung HTML, loại bỏ các phần tử bắt đầu bằng `<!-- Composite Start -->` và kết thúc bằng `<!-- Composite End -->`
     const filteredContent = content.replace(/<!-- Composite Start -->.*?<!-- Composite End -->/gs, match => {
        if (match.includes('<!-- Composite Start -->')) {
          removeFlag = true;
          return '';
        } else if (match.includes('<!-- Composite End -->')) {
          removeFlag = false;
          return '';
        } else {
          return removeFlag ? '' : match;
        }
      });


    // In ra các thông tin đã trích xuất được
    console.log(filteredContent.replace("<!-- CONTENT END 1 -->", ""));
  })
  .catch(error => {
    console.log(error);
  });
