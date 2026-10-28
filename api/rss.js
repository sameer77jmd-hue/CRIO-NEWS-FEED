// Same-origin proxy so the browser never hits a CORS problem.
// Place this file at: <project root>/api/rss.js  (next to index.html)
module.exports = async function handler(req, res) {
    const url = req.query.url;
    const allowed = ["https://storage.googleapis.com/fullstack-assessment/"];

    if (!url || !allowed.some((prefix) => url.startsWith(prefix))) {
        return res.status(400).send("Invalid url");
    }

    try {
        const upstream = await fetch(url);
        if (!upstream.ok) {
            return res.status(upstream.status).send("Upstream error");
        }
        const text = await upstream.text();
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "s-maxage=300");
        return res.status(200).send(text);
    } catch (err) {
        return res.status(500).send("Failed to fetch feed");
    }
};
