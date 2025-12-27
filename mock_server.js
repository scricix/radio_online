
// Mock Server Logic for GitHub Portfolio Prototype
// This file intercepts fetch requests to simulate the PHP backend.

const MOCK_PLAYLIST = [
    { filename: "imn_ciocile.mp3", display_name: "Imnul Radio Ciocile" },
    { filename: "melodie1.mp3", display_name: "Melodie Populară 1" },
    { filename: "melodie2.mp3", display_name: "Melodie Populară 2" },
    { filename: "test.mp3", display_name: "Test Audio" }
];

// State for the mock server
let chatMessages = [
    { nickname: "Admin", message: "Bine ați venit pe versiunea de portofoliu!", time: "Acum" },
    { nickname: "Vizitator", message: "Interfața arată superb!", time: "1 min în urmă" }
];

let reactions = [];
let reactionIdCounter = 1;

// Helper to get current track based on time
function getCurrentMockTrack() {
    const TRACK_DURATION = 180; // Assumed 3 minutes per track for simulation
    const now = Math.floor(Date.now() / 1000);
    
    // Simple rotation based on time
    const totalDuration = MOCK_PLAYLIST.length * TRACK_DURATION;
    const cyclePosition = now % totalDuration;
    const trackIndex = Math.floor(cyclePosition / TRACK_DURATION);
    const trackStartTime = now - (cyclePosition % TRACK_DURATION);
    
    // History (previous tracks)
    const history = [];
    for(let i=1; i<=3; i++) {
        let prevIndex = trackIndex - i;
        if(prevIndex < 0) prevIndex += MOCK_PLAYLIST.length;
        history.push(MOCK_PLAYLIST[prevIndex].display_name);
    }

    return {
        track: MOCK_PLAYLIST[trackIndex].filename,
        display: MOCK_PLAYLIST[trackIndex].display_name,
        timestamp: trackStartTime,
        server_time: now,
        history: history
    };
}

// Override global fetch
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
    const urlStr = url.toString();
    
    // Simulate heartbeat.php
    if (urlStr.includes('heartbeat.php')) {
        const data = getCurrentMockTrack();
        return new Response(JSON.stringify({
            track: data.track,
            timestamp: data.timestamp,
            server_time: data.server_time,
            radio_status: 'on',
            history: data.history
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Simulate chat.php
    if (urlStr.includes('chat.php')) {
        if (options && options.method === 'POST') {
            const body = JSON.parse(options.body);
            chatMessages.push({
                nickname: body.nickname,
                message: body.message,
                time: "Chiar acum"
            });
            if (chatMessages.length > 50) chatMessages.shift();
            return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        } else {
            return new Response(JSON.stringify(chatMessages), { status: 200 });
        }
    }

    // Simulate reaction.php
    if (urlStr.includes('reaction.php')) {
        if (options && options.method === 'POST') {
            const body = JSON.parse(options.body);
            reactions.push({ id: reactionIdCounter++, emoji: body.emoji });
            return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        } else {
            // Return recent reactions (simplified)
            return new Response(JSON.stringify(reactions), { status: 200 });
        }
    }

    // Fallback to original fetch for real files (images, mp3s)
    return originalFetch(url, options);
};
