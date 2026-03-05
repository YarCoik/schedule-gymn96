export default async function handler(req, res) {
    // 🔥 МЫ ПОМЕНЯЛИ НАЗВАНИЯ ПЕРЕМЕННЫХ НА НОВЫЕ (UPSTASH) 🔥
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 1. ПРОВЕРКА ПОДКЛЮЧЕНИЯ БАЗЫ
    if (!kvUrl || !token) {
        return res.status(500).json({ error: "База Upstash Redis не подключена! Проверь переменные UPSTASH_REDIS_REST_URL в Vercel." });
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
            return res.status(500).json({ error: 'Ошибка записи в саму БД.' });
        }
    }

    return res.status(405).json({ error: 'Метод не разрешен' });
}
