export async function onRequest(context) {
    console.error("🚀 Cloudflare Function 运行成功");
    return new Response("Hello from Cloudflare Pages Functions!", {
        headers: { "Content-Type": "text/plain" }
    });
}