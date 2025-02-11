const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

async function downloadSegments(m3u8Url, sessionDir) {
    const { data } = await axios.get(m3u8Url);
    const lines = data.split("\n").filter(line => line && !line.startsWith("#"));

    if (!lines.length) throw new Error("No TS segments found!");

    const downloadDir = path.join(sessionDir, "downloads");
    await fs.ensureDir(downloadDir);
    const segmentFiles = [];

    for (let i = 0; i < lines.length; i++) {
        const segmentUrl = new URL(lines[i], m3u8Url).href;
        const segmentPath = path.join(downloadDir, `segment${i}.ts`);
        const response = await axios.get(segmentUrl, { responseType: "arraybuffer" });
        await fs.writeFile(segmentPath, response.data);
        segmentFiles.push(segmentPath);
    }
    return segmentFiles;
}

async function mergeSegments(segmentFiles, sessionDir) {
    const mergedPath = path.join(sessionDir, "merged.ts");
    const fileListPath = path.join(sessionDir, "fileList.txt");
    const fileList = segmentFiles.map(file => `file '${file}'`).join("\n");
    await fs.writeFile(fileListPath, fileList);

    return new Promise((resolve, reject) => {
        const command = `"${ffmpegPath}" -f concat -safe 0 -i "${fileListPath}" -c copy "${mergedPath}"`;
        exec(command, (error) => {
            if (error) return reject(error);
            resolve(mergedPath);
        });
    });
}

async function convertToMp4(tsFile, sessionDir) {
    const outputPath = path.join(sessionDir, "output.mp4");

    return new Promise((resolve, reject) => {
        const command = `"${ffmpegPath}" -i "${tsFile}" -c:v libx264 -preset fast -c:a aac "${outputPath}"`;
        exec(command, (error) => {
            if (error) return reject(error);
            
            // Ensure file is fully written
            setTimeout(() => {
                resolve(outputPath);
            }, 2000);
        });
    });
}

async function cleanupFiles(sessionDir) {
    try {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait before deleting
        await fs.remove(sessionDir);
        console.log(`✅ Cleanup complete for session: ${sessionDir}`);
    } catch (error) {
        console.error(`❌ Error cleaning up session files: ${error}`);
    }
}

module.exports = { downloadSegments, mergeSegments, convertToMp4, cleanupFiles };
