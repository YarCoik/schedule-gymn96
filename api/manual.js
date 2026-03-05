export default async function handler(req, res) {
    const kvUrl = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    // Если база еще не подключена, просто ничего не делаем
    if (!kvUrl || !token) return res.status(200).send(""); 

    // Отдача ручного расписания на сайт
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

    // Сохранение или удаление ручного расписания из админки
    if (req.method === 'POST') {
        const { password, htmlContent, action } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Неверный пароль!' });
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
            return res.status(500).json({ error: 'Ошибка БД' });
        }
    }
}
