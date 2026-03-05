export default async function handler(req, res) {
    const kvUrl = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    // 1. ПРОВЕРКА ПОДКЛЮЧЕНИЯ БАЗЫ
    if (!kvUrl || !token) {
        return res.status(500).json({ error: "База Vercel KV не подключена! Зайди в Vercel -> Settings -> Environment Variables и проверь, есть ли там KV_REST_API_URL." });
    }

    // 2. ОТДАЧА РАСПИСАНИЯ НА ГЛАВНЫЙ САЙТ (GET)
    if (req.method === 'GET') {
        try {
            const response = await fetch(`${kvUrl}/get/manual_schedule`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            res.setHeader("Access-Control-Allow-Origin", "*");
            return res.status(200).send(data.result || "");
        } catch (e) {
            return res.status(500).send("");
        }
    }

    // 3. СОХРАНЕНИЕ ИЗ АДМИНКИ (POST)
    if (req.method === 'POST') {
        const { password, htmlContent, action } = req.body;
        
        // Проверка пароля
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Неверный пароль от админки!' });
        }

        try {
            if (action === 'clear') {
                await fetch(`${kvUrl}/del/manual_schedule`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await fetch(`${kvUrl}/set/manual_schedule`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify(htmlContent)
                });
            }
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: 'Ошибка записи в саму БД Vercel.' });
        }
    }

    return res.status(405).json({ error: 'Метод не разрешен' });
}
