exports.handler = async function handler(event) {
    const rawUrl = event.queryStringParameters?.url;

    if (!rawUrl) {
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Missing url" })
        };
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(rawUrl);
    } catch (error) {
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Invalid url" })
        };
    }

    if (!/spotify\.com$/i.test(parsedUrl.hostname) || !/\/track\//i.test(parsedUrl.pathname)) {
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Url must be a Spotify track" })
        };
    }

    const extractMeta = (html, property) => {
        const safeProp = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`<meta[^>]+property=["']${safeProp}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
        const match = html.match(regex);
        return match ? match[1] : "";
    };

    try {
        const response = await fetch(parsedUrl.toString(), {
            redirect: "follow",
            headers: {
                "user-agent": "Mozilla/5.0 (compatible; GirasolHermosaBot/1.0)"
            }
        });

        if (!response.ok) {
            throw new Error(`Spotify request failed (${response.status})`);
        }

        const html = await response.text();

        const title = extractMeta(html, "og:title").trim();
        const description = extractMeta(html, "og:description").trim();
        const previewUrl = extractMeta(html, "og:audio").trim();

        const artist = description ? description.split("·")[0].trim() : "";

        if (!title) {
            return {
                statusCode: 502,
                headers: {
                    "content-type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({ error: "Could not extract track title" })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "public, max-age=86400"
            },
            body: JSON.stringify({
                url: response.url || parsedUrl.toString(),
                title,
                artist,
                previewUrl
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: error.message || "Unexpected error" })
        };
    }
};
