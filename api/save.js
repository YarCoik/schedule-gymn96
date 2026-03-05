export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Только POST запросы, бро');
    
    const { password, htmlContent } = req.body;

    // Проверяем пароль
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Неверный пароль! 🚨' });
    }

    // Сохраняем в Vercel KV
    const kvUrl = `${process.env.KV_REST_API_URL}/set/schedule_changes`;
    const response = await fetch(kvUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(htmlContent)
    });

    if (response.ok) {
        res.status(200).json({ success: true });
    } else {
        res.status(500).json({ error: 'Ошибка записи в базу' });
    }
}
