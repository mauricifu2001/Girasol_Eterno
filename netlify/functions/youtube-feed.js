exports.handler = async function handler(event) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = event.queryStringParameters?.channelId;
    const series = event.queryStringParameters?.series || "Fucknews Fridays";
    const note = event.queryStringParameters?.note || "Otro viernes guardado en nuestro museo.";
    const requestedLimit = Number.parseInt(event.queryStringParameters?.limit || "80", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 150) : 80;

    if (!apiKey) {
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Missing YOUTUBE_API_KEY" })
        };
    }

    if (!channelId) {
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Missing channelId" })
        };
    }

    try {
        const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`
        );

        if (!channelResponse.ok) {
            throw new Error(`Channel lookup failed with ${channelResponse.status}`);
        }

        const channelPayload = await channelResponse.json();
        const uploadsPlaylistId = channelPayload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) {
            throw new Error("No uploads playlist found for channel");
        }

        const entries = [];
        let pageToken = "";

        while (entries.length < limit) {
            const pageSize = Math.min(50, limit - entries.length);
            const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
            playlistUrl.searchParams.set("part", "snippet");
            playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
            playlistUrl.searchParams.set("maxResults", String(pageSize));
            playlistUrl.searchParams.set("key", apiKey);

            if (pageToken) {
                playlistUrl.searchParams.set("pageToken", pageToken);
            }

            const playlistResponse = await fetch(playlistUrl);

            if (!playlistResponse.ok) {
                throw new Error(`Playlist lookup failed with ${playlistResponse.status}`);
            }

            const playlistPayload = await playlistResponse.json();

            for (const item of playlistPayload.items || []) {
                const title = item.snippet?.title;
                const videoId = item.snippet?.resourceId?.videoId;

                if (!title || !videoId || title === "Private video" || title === "Deleted video") {
                    continue;
                }

                entries.push({
                    title,
                    series,
                    note,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    publishedAt: item.snippet?.publishedAt || null
                });
            }

            pageToken = playlistPayload.nextPageToken || "";

            if (!pageToken) {
                break;
            }
        }

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "public, max-age=900"
            },
            body: JSON.stringify({
                source: "youtube-api",
                entries
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                error: error.message || "Unexpected error"
            })
        };
    }
};