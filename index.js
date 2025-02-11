const express = require("express");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const cors = require("cors");
const { downloadSegments, mergeSegments, convertToMp4, cleanupFiles } = require("./utiils/helping");
const app = express();
const PORT = 3000;

app.use(cors("*"));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from the server!", intro: "it takes .m3u8 and give .mp4" });
})

app.post("/convert", async (req, res) => {
    try {
        const { m3u8Url } = req.body;
        if (!m3u8Url) return res.status(400).json({ error: "m3u8Url is required" });

        const sessionId = uuidv4(); // Generate a unique session ID
        const sessionDir = path.join(__dirname, "sessions", sessionId);
        await fs.ensureDir(sessionDir);

        console.log(`📥 Processing request [Session: ${sessionId}]...`);

        console.log("📥 Downloading TS segments...");
        const segmentFiles = await downloadSegments(m3u8Url, sessionDir);

        console.log("🔗 Merging TS segments...");
        const mergedTsFile = await mergeSegments(segmentFiles, sessionDir);

        console.log("🎥 Converting to MP4...");
        const mp4Path = await convertToMp4(mergedTsFile, sessionDir);

        console.log("✅ Sending file...");
        res.download(mp4Path, "converted.mp4", async (err) => {
            if (err) console.error(`❌ Error sending file for session ${sessionId}:`, err);
            await cleanupFiles(sessionDir); // Clean only this session's files
        });

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
