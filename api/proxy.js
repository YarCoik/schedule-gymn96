export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send("No URL provided");

    try {
        const response = await fetch(url);
        const html = await response.text();
        
        // Магия, которая разрешает CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        
        res.status(200).send(html);
    } catch (e) {
        res.status(500).send("Server Error");
    }
}
