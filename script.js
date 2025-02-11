const express = require("express");
const axios = require("axios");
const fs = require("fs-extra");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const cors = require("cors");
// ffmpeg.setFfmpegPath("C:\ffmpeg\bin");
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Ensure "videos" directory exists
const VIDEO_DIR = path.join(__dirname, "videos");
fs.ensureDirSync(VIDEO_DIR);

// Convert M3U8 to MP4 and return video
app.post("/convert", async (req, res) => {
  const { m3u8Url } = req.body;
  if (!m3u8Url) {
    return res.status(400).json({ error: "M3U8 URL is required" });
  }

  try {
    const videoFileName = `video_${Date.now()}.mp4`;
    const videoPath = path.join(VIDEO_DIR, videoFileName);

    console.log("Downloading & converting M3U8 to MP4...");

    await new Promise((resolve, reject) => {
      ffmpeg(m3u8Url)
        .output(videoPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log("MP4 Conversion done!");
    res.download(videoPath, videoFileName, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        return res.status(500).json({ error: "Failed to send the MP4 file" });
      }
    });
    
    // Ensure file is deleted after response is sent
    res.on("finish", () => {
      fs.unlink(videoPath, (err) => {
        if (err) console.error("Failed to delete video:", err);
        else console.log("Video file deleted successfully.");
      });
    });
    

  } catch (error) {
    console.error("Error processing video:", error);
    res.status(500).json({ error: "Failed to process video" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
