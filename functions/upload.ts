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
        `, {headers: {"Content-Type": "text/html"}});
    }

    if (context.request.method === "POST") {
        const GITHUB_TOKEN = context.env.GITHUB_TOKEN;
        const GITHUB_REPO = "sevenJustFine/blog_test";

        try {
            const formData = await context.request.formData();
            const title = formData.get("title")?.toString().trim();
            const content = formData.get("content")?.toString().trim();

            if (!title || !content) {
                return new Response("标题和内容不能为空", {status: 400});
            }

            // 生成文件名和年份目录
            const {year, dateString} = getFormattedDate();
            const baseDir = `${year}`; // 按年份创建目录
            const htmlFilePath = `${baseDir}/${dateString}.html`;

            const htmlContent = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试一下</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: auto;
        }

        h1 {
            color: #333;
        }

        p {
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p>${content.replace(/\n/g, "<br>")}</p>
</body>
</html>`;

            // 上传HTML
            await uploadToGitHub(GITHUB_REPO, htmlFilePath, htmlContent, GITHUB_TOKEN, dateString);

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
        `, {headers: {"Content-Type": "text/html"}});

        } catch (error) {
            return new Response(`发布失败: ${error.message}`, {status: 500});
        }
    }

    return new Response("Method Not Allowed", {status: 405});
}

function getFormattedDate() {
    const now = new Date();
    const offset = 8 * 60; // 东8区偏移量（分钟）
    const localTime = new Date(now.getTime() + offset * 60 * 1000); // 调整为东8区时间

    const year = localTime.getFullYear();
    const month = (localTime.getMonth() + 1).toString().padStart(2, "0");
    const day = localTime.getDate().toString().padStart(2, "0");
    const hours = localTime.getHours().toString().padStart(2, "0");
    const minutes = localTime.getMinutes().toString().padStart(2, "0");
    const seconds = localTime.getSeconds().toString().padStart(2, "0");

    const dateString = `${month}-${day}_${hours}-${minutes}-${seconds}`; // 生成文件名
    return {year, dateString};
}

// 上传到 GitHub 函数
async function uploadToGitHub(repo: string, filePath: string, content: string, token: string, fileName: string) {
    try {
        console.log("📌 生成的文件名：", fileName);

        const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
        console.log("📌 GitHub API URL:", url); // 打印请求 URL

        // Base64 编码文件内容
        const utf8Content = new TextEncoder().encode(content);
        const base64Content = btoa(String.fromCharCode(...utf8Content));

        const commitMessage = `Add ${filePath}`; // 提交消息

        const requestBody = JSON.stringify({
            message: commitMessage,
            content: base64Content,
        });

        console.log("📌 Request Body:", requestBody); // 打印请求内容

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json",
                "User-Agent": "Cloudflare-Pages-Function",
            },
            body: requestBody,
        });

        const responseText = await response.text();
        console.log("📌 GitHub API Response:", responseText); // 打印 GitHub API 返回内容

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${responseText}`);
        }

        console.log("✅ 文件上传成功！", fileName);
    } catch (error) {
        console.error("❌ 发生错误:", error);
    }
}