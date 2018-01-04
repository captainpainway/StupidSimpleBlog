const fs = require('fs'); // Node file system
const showdown = require('showdown'); // Markdown processor
const prism = require('prismjs'); // Styling for code tags
const jsdom = require('jsdom'); // DOM emulator to process code tags
const {JSDOM} = jsdom;

// These variables are for creating post lists.
let posts = [];
let length = 0;
let counter = 0;

// Read the posts directory and get each file.
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

// Get the contents of each markdown file.
const getContents = (file, fileName) => {
    fs.readFile(file, 'utf8', (err, contents) => {
        if(err) throw err;
        processMarkdown(contents, fileName);
    });
};

/*
    The first three lines of the markdown files contain extra info. Get the info and strip those out.
    Run the markdown through the converter.
    Then put that HTML into jsdom and look for code and image nodes.
    Process code nodes with Prism so we get pretty code highlighting.
    Give image tags an image class for custom CSS.
    Push each post to an array and update the counter.
    If the counter reaches the total number of posts, sort the posts by date and create post list and home pages.
*/
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
    const codeNode = dom.window.document.getElementsByTagName('code');
    const imgNode = dom.window.document.getElementsByTagName('img');
    if(codeNode) {
        for (var i = 0; i < codeNode.length; i++) {
            const code = codeNode[i].textContent;
            const name = codeNode[i].className;
            const processed = prism.highlight(code, prism['languages'][name]);
            codeNode[i].innerHTML = processed;
        }
    }
    if(imgNode) {
        for (var i = 0; i < imgNode.length; i++) {
            imgNode[i].parentElement.className = 'image';
        }
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

// Insert dynamic content into the post template, add previous/next links, and write the file to the static folder.
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

// For each post in the posts array, create HTML as a string, place into the template, and write the file to the static directory.
const postList = (posts) => {
    fs.readFile('./templates/list_template.html', 'utf8', (err, contents) => {
        if(err) throw err;
        let postList = '';
        posts.forEach(post => {
            postList += `<time>${post.date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</time><a href="./posts/${post.dir}/">${post.title}</a>\n`
        });
        const html = contents.replace(/{{posts}}/g, postList);
        fs.writeFile('./static/blog/index.html', html, err => {
            if(err) throw err;
            console.log(`Created blog index at /static/blog/`);
        });
    });
};

// Add the three newest posts to the home template and write the file to the static directory.
const makeHomePage = (posts) => {
    fs.readFile('./templates/home_template.html', 'utf8', (err, contents) => {
        if(err) throw err;
        let postList = '';
        posts.forEach((post, i) => {
            if(i < 3) {
                postList += `<time>${post.date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</time><a href="./blog/posts/${post.dir}/">${post.title}</a>\n`
            }
        });
        const html = contents.replace(/{{posts}}/g, postList);
        fs.writeFile('./static/index.html', html, err => {
            if(err) throw err;
            console.log(`Created home page at /static/`);
        });
    });
};

