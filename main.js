
// Main Application Logic

// Player Instances
const player1 = new Audio();
const player2 = new Audio();
let activePlayer = player1;
let inactivePlayer = player2;

const statusText = document.getElementById('status');
const audioUnlock = document.getElementById('audioUnlock');

// Config
// NOTE: For GitHub Pages, you must ensure the 'muzica' folder includes these files
// or change this path to a public URL.
const folderPath = "../muzica/";

// Use the global MOCK_PLAYLIST defined in mock_server.js
const melodiileMele = typeof MOCK_PLAYLIST !== 'undefined' ? MOCK_PLAYLIST : [];

let currentIndex = 0;
let isSynced = true;
let lastSyncedTrack = "";
let isChangingTrack = false;

// --- YouTube API Setup ---
let ytPlayer;
let isYTReady = false;
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function () {
    isYTReady = true;
};

const equalizer = document.getElementById('equalizer');
const fakeListenersEl = document.getElementById('fakeListeners');

// Simulare discretă ascultători
let fakeCount = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
if (fakeListenersEl) fakeListenersEl.textContent = fakeCount;

function updateFakeListeners() {
    const change = Math.floor(Math.random() * 5) - 2;
    fakeCount += change;
    if (fakeCount < 1) fakeCount = 1;
    if (fakeCount > 50) fakeCount = 50;
    if (fakeListenersEl) fakeListenersEl.textContent = fakeCount;
}
setInterval(updateFakeListeners, 5000);

function fadeIn(p) {
    let vol = 0;
    const targetVol = document.getElementById('volume').value;
    p.volume = 0;
    const interval = setInterval(() => {
        vol += 0.05;
        if (vol >= targetVol) { p.volume = targetVol; clearInterval(interval); }
        else p.volume = vol;
    }, 100);
}

function fadeOut(p) {
    let vol = p.volume;
    const interval = setInterval(() => {
        vol -= 0.05;
        if (vol <= 0) { p.volume = 0; p.pause(); clearInterval(interval); }
        else p.volume = vol;
    }, 100);
}

function playTrack(idx, offset = 0) {
    if (melodiileMele.length === 0 || isChangingTrack) return;

    const currentTrackObj = melodiileMele[idx];
    const currentFilename = currentTrackObj.filename;
    const currentDisplay = currentTrackObj.display_name;

    if (currentFilename.substr(0, 3) === 'YT_') {
        playYouTube(currentFilename.replace('YT_', ''), offset);
        return;
    }

    const isCrossfade = (offset === 0 && activePlayer.src !== "");
    const nextPlayer = isCrossfade ? inactivePlayer : activePlayer;
    const oldPlayer = activePlayer;

    // Ascundem YouTube
    document.getElementById('ytPlayerContainer').style.display = 'none';

    isChangingTrack = true;
    statusText.textContent = currentDisplay;
    equalizer.style.display = 'flex';

    const safeUrl = folderPath + encodeURIComponent(currentFilename) + "?t=" + Date.now();

    lastSyncedTrack = currentFilename;

    nextPlayer.src = safeUrl;
    nextPlayer.load();

    nextPlayer.onerror = () => {
        console.error("Error loading track: " + currentFilename + ". Make sure the file exists in ../muzica/");
        isChangingTrack = false;
        // In prototype, we just verify sync again
        setTimeout(checkSync, 1000);
    };

    nextPlayer.oncanplay = () => {
        nextPlayer.oncanplay = null;
        nextPlayer.onerror = null;
        if (offset > 0) nextPlayer.currentTime = offset;

        nextPlayer.play().then(() => {
            audioUnlock.style.display = 'none';
            updateMediaSession(currentDisplay);

            nextPlayer.onended = () => {
                lastSyncedTrack = "";
                isChangingTrack = false;
                // Trigger next via heartbeat (mocked)
                checkSync();
            };

            if (isCrossfade) {
                fadeIn(nextPlayer);
                fadeOut(oldPlayer);
                activePlayer = nextPlayer;
                inactivePlayer = oldPlayer;
            } else {
                nextPlayer.volume = document.getElementById('volume').value;
            }
        }).catch(() => {
            statusText.textContent = "Apasă pentru recepție";
        });

        isChangingTrack = false;
        lastSyncedTrack = currentFilename;
        currentIndex = idx;
    };
}

function updateMediaSession(trackName) {
    if ('mediaSession' in navigator) {
        const cleanName = trackName.replace('.mp3', '').replace(/_/g, ' ');
        navigator.mediaSession.metadata = new MediaMetadata({
            title: cleanName,
            artist: 'Radio Ciocile',
            album: 'Emisie Live',
            artwork: [
                { src: '../imag_radiociocile.jpg', sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        const skipSync = () => { isSynced = true; checkSync(); };

        navigator.mediaSession.setActionHandler('play', skipSync);
        navigator.mediaSession.setActionHandler('pause', () => {
            activePlayer.pause();
            if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
            isSynced = false;
            updatePlayButtonUI();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            checkSync();
        });

        navigator.mediaSession.setActionHandler('previoustrack', skipSync);

        try {
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen').catch(() => { });
            }
        } catch (e) { }
    }
}

function playYouTube(videoId, offset) {
    if (!isYTReady) {
        setTimeout(() => playYouTube(videoId, offset), 500);
        return;
    }

    activePlayer.pause();
    inactivePlayer.pause();
    equalizer.style.display = 'flex';

    statusText.textContent = "Radio Ciocile - LIVE 🎶";
    lastSyncedTrack = "YT_" + videoId;
    updateMediaSession("Radio Ciocile - Muzică Live");

    if (!ytPlayer) {
        ytPlayer = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 1,
                'start': offset,
                'modestbranding': 1
            },
            events: {
                'onReady': (event) => {
                    event.target.playVideo();
                    event.target.seekTo(offset);
                    event.target.setVolume(document.getElementById('volume').value * 100);
                    audioUnlock.style.display = 'none';
                },
                'onStateChange': (event) => {
                    if (event.data === 0) {
                        lastSyncedTrack = "";
                        isChangingTrack = false;
                        checkSync();
                    }
                }
            }
        });
    } else {
        ytPlayer.loadVideoById({
            videoId: videoId,
            startSeconds: offset
        });
    }
}

async function checkSync() {
    if (!isSynced) return;
    try {
        const response = await fetch('heartbeat.php?ping=1&nocache=' + Date.now());
        if (!response.ok) return;

        const data = await response.json();
        const serverTrack = data.track;
        const serverTime = data.timestamp;
        const serverNow = data.server_time || Math.floor(Date.now() / 1000);
        const radioStatus = data.radio_status;

        // 0. Update History
        if (data.history && data.history.length > 0) {
            const recentBox = document.getElementById('recentTracks');
            let html = '';
            const currentTitle = statusText.textContent;
            data.history.forEach((h, i) => {
                if (h !== currentTitle && i < 5) {
                    html += `<div class="msg-item" style="padding: 8px 12px; border-radius: 10px; border-left: 3px solid var(--primary);">
                                <b style="color:var(--text-main);">${h}</b>
                             </div>`;
                }
            });
            if (html) recentBox.innerHTML = html;
        }

        // 1. Check Status
        if (radioStatus === 'off') {
            if (isSynced && !activePlayer.paused) {
                activePlayer.pause();
                inactivePlayer.pause();
                if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
                statusText.textContent = "Emisie încheiată";
                equalizer.style.display = 'none';
                updatePlayButtonUI();
            }
            return;
        }

        if (!serverTrack) {
            statusText.textContent = "Așteptăm emisia...";
            return;
        }

        const offset = serverNow - serverTime;
        const normServerTrack = serverTrack.normalize('NFC').trim();

        // 2. Sync YouTube
        if (normServerTrack.substr(0, 3) === 'YT_') {
            if (lastSyncedTrack !== normServerTrack) {
                isChangingTrack = false;
                playYouTube(normServerTrack.replace('YT_', ''), offset);
            } else if (ytPlayer && ytPlayer.getCurrentTime) {
                const ytDrift = Math.abs(ytPlayer.getCurrentTime() - offset);
                if (ytDrift > 5) ytPlayer.seekTo(offset);
            }
            return;
        }

        // 3. Sync MP3
        if (normServerTrack !== lastSyncedTrack) {
            const index = melodiileMele.findIndex(m => m.filename === normServerTrack);
            if (index !== -1) {
                isChangingTrack = false;
                lastSyncedTrack = normServerTrack;
                playTrack(index, offset);
            }
        } else if (Math.abs(activePlayer.currentTime - offset) > 4 && !isChangingTrack) {
            activePlayer.currentTime = offset;
        }
    } catch (e) { console.error(e); }
}

const playBtn = document.getElementById('playBtn');

function updatePlayButtonUI() {
    if (isSynced) {
        playBtn.innerHTML = "⏸";
        playBtn.classList.remove('paused');
        playBtn.classList.add('playing');
    } else {
        playBtn.innerHTML = "▶";
        playBtn.classList.remove('playing');
        playBtn.classList.add('paused');
    }
}

audioUnlock.onclick = () => {
    audioUnlock.style.display = 'none';
    isSynced = true;
    isChangingTrack = false;
    lastSyncedTrack = "";
    updatePlayButtonUI();
    checkSync();
};

playBtn.onclick = () => {
    if (isSynced) {
        activePlayer.pause();
        inactivePlayer.pause();
        if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        isSynced = false;
        lastSyncedTrack = "";
        statusText.textContent = "Radio Oprit (Manual)";
        equalizer.style.display = 'none';
    } else {
        isSynced = true;
        isChangingTrack = false;
        lastSyncedTrack = "";
        checkSync();
    }
    updatePlayButtonUI();
};

document.getElementById('volume').oninput = (e) => {
    const vol = e.target.value;
    activePlayer.volume = vol;
    inactivePlayer.volume = vol;
    if (ytPlayer && ytPlayer.setVolume) {
        ytPlayer.setVolume(vol * 100);
    }
};

// --- Chat Logic ---
const chatBox = document.getElementById('chatBox');
const chatNick = document.getElementById('chatNick');
const chatMsg = document.getElementById('chatMsg');
const sendBtn = document.getElementById('sendBtn');

async function fetchMessages() {
    try {
        const res = await fetch('chat.php');
        const messages = await res.json();

        if (messages.length === 0) {
            chatBox.innerHTML = '<div style="text-align:center; opacity:0.3; margin-top:80px; font-size:0.8rem;">Niciun mesaj încă. Fii primul care scrie!</div>';
            return;
        }

        chatBox.innerHTML = '';
        messages.forEach(m => {
            const div = document.createElement('div');
            div.className = 'msg-item';
            const safeNick = m.nickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeMsg = m.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            div.innerHTML = `<b>${safeNick}</b>: ${safeMsg} <span>${m.time}</span>`;
            chatBox.appendChild(div);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) { }
}

async function sendMessage() {
    const nick = chatNick.value.trim();
    const msg = chatMsg.value.trim();
    if (!nick || !msg) return;

    sendBtn.disabled = true;
    try {
        await fetch('chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: nick, message: msg })
        });
        chatMsg.value = '';
        fetchMessages();
    } catch (e) { }
    sendBtn.disabled = false;
}

sendBtn.onclick = sendMessage;
chatMsg.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

setInterval(fetchMessages, 4000);
fetchMessages();
setInterval(checkSync, 1000);

setInterval(() => {
    if (isSynced && activePlayer.paused && !isChangingTrack) {
        checkSync();
    }
}, 1000);

// --- Reaction Logic ---
let lastReactionId = 0;

async function sendReaction(emoji) {
    try {
        await fetch('reaction.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji: emoji })
        });
        showFloatingEmoji(emoji);
    } catch (e) { }
}

async function fetchReactions() {
    try {
        const res = await fetch(`reaction.php?since=${lastReactionId}`);
        const list = await res.json();
        list.forEach(r => {
            if (r.id > lastReactionId) {
                showFloatingEmoji(r.emoji);
                lastReactionId = r.id;
            }
        });
    } catch (e) { }
}

function showFloatingEmoji(emoji) {
    const div = document.createElement('div');
    div.className = 'floating-emoji';
    div.textContent = emoji;
    const randX = (Math.random() * 200 - 100) + 'px';
    div.style.setProperty('--rand-x', randX);
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
}

setInterval(fetchReactions, 1500);

window.onload = () => {
    isSynced = true;
    checkSync();
    updatePlayButtonUI();
};
