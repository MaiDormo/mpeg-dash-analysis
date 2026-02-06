#!/bin/bash
set -e

# Define variables
URL="https://download.blender.org/demo/movies/BBB/bbb_sunflower_2160p_30fps_normal.mp4.zip"
BASE_NAME="bbb_sunflower_2160p_30fps_normal"

echo "Downloading video from $URL..."
wget "$URL" -O "${BASE_NAME}.zip"

echo "Extracting zip file..."
unzip -o "${BASE_NAME}.zip"
rm "${BASE_NAME}.zip"

echo "Renaming original video..."
mv "${BASE_NAME}.mp4" "${BASE_NAME}_original.mp4"

echo "Trimming video to 5 minutes..."
ffmpeg -y -ss "00:00:00" -i "${BASE_NAME}_original.mp4" -t "00:05:00" -c copy "${BASE_NAME}.mp4"

echo "Cleaning up..."
rm "${BASE_NAME}_original.mp4"

echo "Video initialization complete."
