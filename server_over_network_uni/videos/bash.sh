#!/bin/bash
set -euo pipefail

# ====================================================================================
# CONFIGURATION
# ====================================================================================

# Define the target resolutions and bitrates
# The index of each array corresponds to a specific quality tier.
# Bitrates are in kbps.
RESOLUTIONS=(2160 1440 1080 720 576 540 432 360 270 180)
BITRATES=(12000 8000 6800 5000 3500 3000 2000 1500 800 500)
WIDTHS=(3840 2560 1920 1280 1024 960 768 640 480 320)
HEIGHTS=(2160 1440 1080 720 576 540 432 360 270 180)

# Segment duration in milliseconds for DASH
SEGMENT_DURATION=4000

# ====================================================================================
# FUNCTIONS
# ====================================================================================

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: '$1' is not installed or not in PATH."
        exit 1
    fi
}

convert_video() {
    local input_file="$1"
    local base_name="${input_file%.*}"
    local generated_files=()

    echo "----------------------------------------------------------------"
    echo "Processing: $input_file"
    echo "----------------------------------------------------------------"

    # 1. Encode into multiple representations using ffmpeg
    for i in "${!RESOLUTIONS[@]}"; do
        local res="${RESOLUTIONS[$i]}"
        local bitrate="${BITRATES[$i]}"
        local width="${WIDTHS[$i]}"
        local height="${HEIGHTS[$i]}"
        
        local output_mp4="${base_name}_${res}.mp4"
        local maxrate=$((bitrate * 2))
        local bufsize=$((maxrate * 2))

        echo "[${res}p] Encoding at ${bitrate}k..."

        # ffmpeg arguments explanation:
        # -y: Overwrite output files without asking
        # -i: Input file
        # -c:v libx264: Use H.264 video codec
        # -preset slow: Better compression efficiency at the cost of encoding speed
        # -b:v: Target average bitrate
        # -maxrate / -bufsize: VBV constraints for streaming (CBR-like behavior)
        # -vf scale: Resize video
        # -r 30: Force 30 fps
        # -g 120: GOP size (Group of Pictures). 120 frames @ 30fps = 4 seconds (matches DASH segment)
        # -keyint_min 120: Minimum GOP size. Forces fixed GOP for DASH alignment.
        # -sc_threshold 0: Disable scene cut detection to ensure constant GOP size.
        # -an: Remove audio (consistent with previous behavior)
        
        ffmpeg -y -hide_banner -loglevel error \
            -i "$input_file" \
            -c:v libx264 \
            -preset slow \
            -b:v "${bitrate}k" \
            -maxrate "${maxrate}k" \
            -bufsize "${bufsize}k" \
            -vf "scale=${width}:${height}" \
            -r 30 \
            -g 120 \
            -keyint_min 120 \
            -sc_threshold 0 \
            -an \
            "$output_mp4"

        generated_files+=("$output_mp4")
    done

    # 2. Package into DASH using MP4Box
    echo "Generating DASH Manifest (.mpd)..."
    
    # MP4Box arguments:
    # -dash: Segment duration in ms
    # -frag: Fragment duration in ms (often same as segment for simple cases)
    # -rap: Ensure segments start with Random Access Points (IDR frames)
    # -profile: DASH profile (live vs onDemand)
    # -out: Output filename
    
    MP4Box -dash "$SEGMENT_DURATION" \
           -frag "$SEGMENT_DURATION" \
           -rap \
           -profile "dashavc264:live" \
           -out "${base_name}.mpd" \
           "${generated_files[@]}"

    echo "Done! Created ${base_name}.mpd"
}

# ====================================================================================
# MAIN EXECUTION
# ====================================================================================

# Check dependencies
check_dependency "ffmpeg"
check_dependency "MP4Box"

# Ensure we are in the script's directory (optional, but good for relative paths)
cd "$(dirname "$(readlink -f "$0")")"

echo "Scanning for videos in $(pwd)..."

# Find .mp4 and .mov files (excluding files that look like intermediate representations, e.g., *_1080.mp4)
# We use a regex to exclude files ending in _[digits].mp4 to avoid re-processing generated files
for f in *.mp4 *.mov; do
    # Skip if no files match glob
    [ -e "$f" ] || continue

    # Skip files that appear to be generated representations (ending in _NUMBER.mp4)
    if [[ "$f" =~ _[0-9]+\.mp4$ ]]; then
        continue
    fi

    # Check if a directory for this video already exists (logic from original script)
    # Original logic: "if [ ! -d "${f%.*}" ]; then".
    # However, the original script didn't create a directory named after the file.
    # It seems the original intention was: if the MPD doesn't exist, generate it.
    
    base_name="${f%.*}"
    if [ ! -f "${base_name}.mpd" ]; then
        convert_video "$f"
    else
        echo "Skipping $f (MPD already exists)"
    fi
done
