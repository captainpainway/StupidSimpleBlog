const fs = require('fs');
const showdown = require('showdown');
const prism = require('prismjs');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;

let posts = [];
let length = 0;
let counter = 0;

fs.readdir('./posts/', (err, files) => {
    if(err) throw err;
    length = files.length;
    files.forEach(file => {
        const fileName = file.substr(0, file.lastIndexOf('.'));
        getContents(`./posts/${file}`, fileName);
    });
    if(length === 0) {
        postList([]);
        makeHomePage([]);
    }
});

const getContents = (file, fileName) => {
    fs.readFile(file, 'utf8', (err, contents) => {
        if(err) throw err;
        processMarkdown(contents, fileName);
    });
};

const processMarkdown = (markdown, fileName) => {
    const lines = markdown.split('\n');
    const title = lines[0].split(':')[1].trim();
    const date = new Date(lines[1].split(':')[1].trim());
    const description = lines[2].split(':')[1].trim();
    lines.splice(0, 4);
    markdown = lines.join('\n');
    const converter = new showdown.Converter();
    const text = converter.makeHtml(markdown);

    const dom = new JSDOM(text);
    const codeNode = dom.window.document.querySelector('code');
    const imgNode = dom.window.document.querySelector('img');
    if(codeNode) {
        const code = codeNode.textContent;
        const name = codeNode.className;
        const processed = prism.highlight(code, prism['languages'][name]);
        codeNode.innerHTML = processed;
    }
    if(imgNode) {
        imgNode.parentElement.className = 'image';
    }

    const data = {
        title: title,
        date: date,
        description: description,
        text: dom.serialize(),
        dir: fileName
    };
    posts.push(data);
    counter++;
    if(counter === length) {
        posts.sort((a, b) => {
            return b.date - a.date;
        });
        postList(posts);
        processHTML(posts);
        makeHomePage(posts);
    }
};

const processHTML = (posts) => {
    posts.forEach((data, i) => {
        fs.readFile('./templates/post_template.html', 'utf8', (err, contents) => {
            if(err) throw err;
            const next = posts[i+1];
            const previous = posts[i-1];
            const html = contents
                .replace(/{{description}}/g, data.description)
                .replace(/{{title}}/g, data.title)
                .replace(/{{date}}/g, data.date.toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}))
                .replace(/{{post}}/g, data.text)
                .replace(/{{next}}/g, next ? next.title : '')
                .replace(/{{nextLink}}/g, next ? `../${next.dir}/` : '')
                .replace(/{{previous}}/g, previous ? previous.title : '')
                .replace(/{{previousLink}}/g, previous ? `../${previous.dir}/` : '');
            const dir = `./static/blog/posts/${data.dir}/`;
            if(!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            fs.writeFile(`${dir}/index.html`, html, err => {
                if(err) throw err;
                console.log(`Created article "${data.title}" at /static/blog/${data.dir}/`);
            });
        });
    });
};

const postList = (posts) => {
    fs.readFile('./templates/list_template.html', 'utf8', (err, contents) => {
        if(err) throw err;
        let postList = '';
        posts.forEach(post => {
            postList += `<time>${post.date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</time><a href="./posts/${post.dir}/">${post.title}</a>\n`
        });
        const html = contents
            .replace(/{{posts}}/g, postList);
        fs.writeFile('./static/blog/index.html', html, err => {
            if(err) throw err;
            console.log(`Created blog index at /static/blog/`);
        });
    });
};

const makeHomePage = (posts) => {
    fs.readFile('./templates/home_template.html', 'utf8', (err, contents) => {
        if(err) throw err;
        let postList = '';
        posts.forEach((post, i) => {
            if(i < 3) {
                postList += `<time>${post.date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</time><a href="./blog/posts/${post.dir}/">${post.title}</a>\n`
            }
        });
        const html = contents
            .replace(/{{posts}}/g, postList);
        fs.writeFile('./static/index.html', html, err => {
            if(err) throw err;
            console.log(`Created home page at /static/`);
        });
    });
};
