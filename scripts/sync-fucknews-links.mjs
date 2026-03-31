import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const apiKey = process.env.YOUTUBE_API_KEY;
const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCc8o0cT4aD3n1Bw3k5GIdQQ";
const outputPath = process.env.FUCKNEWS_OUTPUT_PATH || path.join(rootDir, "fucknews_links.txt");
const maxItems = Number.parseInt(process.env.YOUTUBE_MAX_ITEMS || "200", 10);

if (!apiKey) {
    throw new Error("Missing YOUTUBE_API_KEY environment variable.");
}

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}: ${url}`);
    }

    return response.json();
}

async function getUploadsPlaylistId() {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", channelId);
    url.searchParams.set("key", apiKey);

    const payload = await fetchJson(url);
    const uploadsPlaylistId = payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
        throw new Error("Could not resolve uploads playlist for the configured channel.");
    }

    return uploadsPlaylistId;
}

async function getPlaylistItems(uploadsPlaylistId) {
    const items = [];
    let pageToken = "";

    while (items.length < maxItems) {
        const pageSize = Math.min(50, maxItems - items.length);
        const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
        url.searchParams.set("part", "snippet");
        url.searchParams.set("playlistId", uploadsPlaylistId);
        url.searchParams.set("maxResults", String(pageSize));
        url.searchParams.set("key", apiKey);

        if (pageToken) {
            url.searchParams.set("pageToken", pageToken);
        }

        const payload = await fetchJson(url);

        for (const item of payload.items || []) {
            const title = item.snippet?.title?.replace(/\s+/g, " ").trim();
            const videoId = item.snippet?.resourceId?.videoId;

            if (!title || !videoId || title === "Private video" || title === "Deleted video") {
                continue;
            }

            items.push({
                title,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                publishedAt: item.snippet?.publishedAt || ""
            });
        }

        pageToken = payload.nextPageToken || "";

        if (!pageToken) {
            break;
        }
    }

    return items;
}

function buildOutput(items) {
    const oldestFirst = [...items].reverse();
    return `${oldestFirst.map((item) => `${item.title} | ${item.url}`).join("\n")}\n`;
}

async function main() {
    const uploadsPlaylistId = await getUploadsPlaylistId();
    const items = await getPlaylistItems(uploadsPlaylistId);
    const nextContent = buildOutput(items);

    await mkdir(path.dirname(outputPath), { recursive: true });

    let currentContent = "";

    try {
        currentContent = await readFile(outputPath, "utf8");
    } catch {
        currentContent = "";
    }

    if (currentContent === nextContent) {
        console.log("fucknews_links.txt is already up to date.");
        return;
    }

    await writeFile(outputPath, nextContent, "utf8");
    console.log(`Updated ${path.relative(rootDir, outputPath)} with ${items.length} entries.`);
}

await main();