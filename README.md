# MPEG-DASH Video Streaming Analysis

This repository contains the codebase for my thesis project, focusing on video streaming performance and network traffic analysis using MPEG-DASH within Software Defined Networks (SDN) simulated by Mininet.

## 🎥 Demo

![Project Demo](demo.gif)

## 🚀 Quick Start

### Prerequisites
*   **Linux Environment** (Arch Linux, Ubuntu, etc.)
*   **Bun** (JavaScript runtime)
*   **Python 3**
*   **Mininet**
*   **Open vSwitch**
*   **Chromium** (Recommended, due to the absence of video.webkitVideoDecodedByteCount property in Firefox)

### 1. Start the Network Simulation
Run the Mininet topology script with sudo privileges. You can configure bandwidth, delay, and loss.

```bash
sudo python3 net_conf_mininet/thesis_mininet.py -bw 10 -delay 10ms -loss 0
```

### 2. Start the Streaming Server
Inside the Mininet CLI (`mininet>`), start the HTTP server on **h1**.

```bash
# Start server on host h1
h1 bun server_mininet/server_mininet.js &
```

### 3. Start the Client
Open a browser from another host (e.g., **h2**) to view the stream and analysis charts.

```bash
# Launch Chromium on host h2 (using local display)
h2 env DISPLAY=:1 chromium --no-sandbox --user-data-dir=/tmp/chromium_h2 http://10.0.0.1:1337/ &
```

## 📂 Project Structure

*   **`net_conf_mininet/`**: Contains `thesis_mininet.py`, the Mininet topology script defining switches, hosts, and link constraints.
*   **`server_mininet/`**: The main Node.js (Bun) server and DASH video client.
    *   `videos/`: Contains the DASH `.mpd` manifests and `.m4s` segments.
    *   `videos/client/`: The web client (`client.js`, `dash.js`, `chart.js`) for playback and metrics visualization.
*   **`plot_and_stats/`**: Python scripts for generating plots and analyzing traffic statistics.
*   **`statistics/`**: Output directory for generated statistics organized by network configuration.
*   **`server_over_network_*`**: Server variants for AWS and University network deployment scenarios.

## 🛠️ Configuration

*   **Network Parameters**: Adjust `-bw` (Bandwidth in Mbps), `-delay` (Latency), and `-loss` (Packet loss %) when running `thesis_mininet.py`.
*   **Video Generation**: Use `ffmpeg` and `MP4Box` to generate new DASH content if needed (scripts available in `server_mininet/videos/`).
