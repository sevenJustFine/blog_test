export default {
    async fetch(request) {
        console.log("🚀 Cloudflare Function 运行成功");
        return new Response("Hello World");
    }
};