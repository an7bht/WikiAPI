import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/content', async (req, res) => {
    try {
        const { url_key, username, password, url_web } = req.query;
        const redirectionResult = await checkRedirection(url_key);
        const { domain, title } = redirectionResult.redirected ? parseURL(redirectionResult.redirectedUrl) : parseURL(url_key);
        const [pageId, content] = await Promise.all([
            getWikipediaPageId(domain, title),
            getContentFromPageID(domain, title) // Changed parameter to title
        ]);
        await postWordpress(title, content, username, password, url_web);
        res.json({ status: "ok", text: "Đã đăng bài" });
    } catch (error) {
        console.error('Đã có lỗi xảy ra:', error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

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

function parseURL(url) {
    const urlObject = new URL(url);
    const domain = urlObject.hostname;
    const pathSegments = urlObject.pathname.split('/');
    const title = pathSegments[pathSegments.length - 1];
    return { domain, title };
}

async function getWikipediaPageId(domain, title) {
    console.log("Domain: "+domain+"; Title: "+ title)
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

async function getContentFromPageID(domain, title) { // Changed parameter to title
    const pageId = await getWikipediaPageId(domain, title); // Moved here
    const response = await fetch(`https://${domain}/w/api.php?action=parse&pageid=${pageId}&formatversion=2&format=json`);
    const data = await response.json();
    const $ = cheerio.load(data.parse.text);
    $('.navbox').remove();
    return $.html();
}

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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
