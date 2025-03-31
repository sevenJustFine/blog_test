export async function onRequest(context) {
    if (context.request.method === "GET") {
        // 显示上传页面
        return new Response(`
            <!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>发布文章</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; }
                    label { font-weight: bold; display: block; margin-top: 10px; }
                    textarea, input { width: 100%; padding: 10px; margin-top: 5px; }
                    button { padding: 10px 15px; margin-top: 10px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h2>发布文章</h2>
                <form action="/upload" method="POST">
                    <label>标题:</label>
                    <input type="text" name="title" required>
                    <label>内容 (Markdown):</label>
                    <textarea name="content" rows="8" required></textarea>
                    <button type="submit">发布</button>
                </form>
            </body>
            </html>
        `, { headers: { "Content-Type": "text/html" } });
    }

    if (context.request.method === "POST") {
        const GITHUB_TOKEN = context.env.GITHUB_TOKEN;  // 你的 GitHub Token
        const GITHUB_REPO = "sevenJustFine/blog_test";  // 你的 GitHub 仓库
        const BASE_PATH = "articles";                   // 存储 HTML 页面路径

        try {
            // 解析提交数据
            const formData = await context.request.formData();
            const title = formData.get("title")?.toString().trim();
            const content = formData.get("content")?.toString().trim();

            if (!title || !content) {
                return new Response("标题和内容不能为空", { status: 400 });
            }

            // 生成文件名
            const slug = title.replace(/\s+/g, "-").toLowerCase(); // 文章 URL 友好化
            const mdFilePath = `content/${slug}.md`;
            const htmlFilePath = `${BASE_PATH}/${slug}.html`;

            // 生成 Markdown
            const markdown = `# ${title}\n\n${content}`;

            // 生成 HTML（使用简单的模板）
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="zh">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
                        h1 { color: #333; }
                        p { line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <p>${content.replace(/\n/g, "<br>")}</p>
                </body>
                </html>
            `;

            // 上传 Markdown 到 GitHub
            await uploadToGitHub(GITHUB_REPO, mdFilePath, markdown, GITHUB_TOKEN);
            // 上传 HTML 到 GitHub
            await uploadToGitHub(GITHUB_REPO, htmlFilePath, htmlContent, GITHUB_TOKEN);

            // 返回成功信息
            return new Response(`
                <!DOCTYPE html>
                <html lang="zh">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>发布成功</title>
                </head>
                <body>
                    <h2>文章发布成功！</h2>
                    <p><a href="/${htmlFilePath}">点击这里查看文章</a></p>
                </body>
                </html>
            `, { headers: { "Content-Type": "text/html" } });
        } catch (error) {
            return new Response(`发布失败: ${error.message}`, { status: 500 });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
}

async function uploadToGitHub(repo: string, filePath: string, content: string, token: string) {
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    console.log("GitHub API URL:", url); // 打印请求 URL

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `token ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "Cloudflare-Pages-Function",
        },
        body: JSON.stringify({
            message: `Add ${filePath}`,
            content: btoa(unescape(encodeURIComponent(content))),
        }),
    });

    const responseText = await response.text();
    console.log("GitHub API Response:", responseText); // 打印 GitHub API 返回内容

    if (!response.ok) {
        throw new Error(`GitHub API Error: ${responseText}`);
    }
}