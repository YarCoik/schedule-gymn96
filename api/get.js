export default async function handler(req, res) {
    const kvUrl = `${process.env.KV_REST_API_URL}/get/schedule_changes`;
    
    try {
        const response = await fetch(kvUrl, {
            headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
        });
        const data = await response.json();
        
        const html = data.result || "<div class='doc-title'>Нет актуальных изменений 🎉</div>";

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(html);
    } catch (e) {
        res.status(500).send("Ошибка БД");
    }
}
