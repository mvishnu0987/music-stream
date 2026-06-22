import https from 'https';

const JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php";
const INSECURE_AGENT = new https.Agent({ rejectUnauthorized: false });

function fetchUrl(urlStr) {
  const parsed = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        agent: INSECURE_AGENT,
        headers: {
          "Accept": "application/json, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://www.jiosaavn.com/",
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(data));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function test() {
  const artistId = "459320"; // Arijit Singh
  const artistPageUrl = `${JIOSAAVN_BASE}?__call=artist.getArtistPageDetails&_format=json&_marker=0&cc=in&artistId=${artistId}&n_song=10`;
  try {
    const detailBody = await fetchUrl(artistPageUrl);
    const detailData = JSON.parse(detailBody);
    console.log("Artist Details Keys:", Object.keys(detailData));
    console.log("Artist Name:", detailData.name);
    console.log("topSongs keys/length:", detailData.topSongs ? Object.keys(detailData.topSongs) : "undefined");
    if (detailData.topSongs) {
      console.log("topSongs structure preview:", JSON.stringify(detailData.topSongs).slice(0, 500));
    }
  } catch (e) {
    console.error("Artist test failed:", e.message);
  }
}

test();
