'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * Promise-based confirmation dialog. Resolves `true` only when the user
 * clicks the confirming button; Cancel, Esc, and clicking outside the modal
 * all resolve `false`.
 */
function confirmAction(app, options) {
    return new Promise((resolve) => {
        new ConfirmModal(app, options, resolve).open();
    });
}
class ConfirmModal extends obsidian.Modal {
    constructor(app, options, resolveConfirm) {
        super(app);
        this.options = options;
        this.resolveConfirm = resolveConfirm;
        this.confirmed = false;
    }
    onOpen() {
        this.modalEl.addClass("gp-confirm-modal");
        this.titleEl.setText(this.options.title);
        this.contentEl.createEl("p", { text: this.options.body });
        new obsidian.Setting(this.contentEl)
            .addButton((btn) => btn.setButtonText("Cancel").onClick(() => {
            this.close();
        }))
            .addButton((btn) => {
            btn
                .setButtonText(this.options.ctaText)
                .setCta()
                .onClick(() => {
                this.confirmed = true;
                this.close();
            });
            if (this.options.destructive)
                markDestructive(btn);
        });
    }
    onClose() {
        this.contentEl.empty();
        // Runs on every way out (confirm, Cancel, Esc, click-outside), so the
        // promise can never be left dangling.
        this.resolveConfirm(this.confirmed);
    }
}
/**
 * Style a button as destructive across Obsidian versions. setDestructive()
 * only exists on 1.13+, so probe for it at runtime; older versions fall back
 * to setWarning(), their only destructive styling. Both are called through a
 * structural probe type rather than the typed members, so the (1.13-only)
 * deprecation of setWarning never applies to code that runs only where it is
 * the sole option.
 */
function markDestructive(btn) {
    const probe = btn;
    if (probe.setDestructive) {
        probe.setDestructive();
    }
    else if (probe.setWarning) {
        probe.setWarning();
    }
}

// Central home for shared, static values so they aren't duplicated as magic strings/numbers.
const VIEW_TYPE_GENTLE_POMO = "gentle-pomo-view";
const NO_TASK_LABEL = "No Task";
const ONE_MINUTE_MS = 60000;
// How long the tapped-to-peek countdown stays revealed on touch before auto-hiding.
const PEEK_REVEAL_MS = 2000;
// Cache TTL for "today's total focus seconds" — read by both the status bar
// refresh loop in main.ts and the public method on LogManager.
const FOCUS_TOTAL_CACHE_TTL_MS = 30000;
// Idle heartbeat for the focus-total display. The engine only emits while
// running or on user actions, so without this an app left open across local
// midnight keeps yesterday's "Today X / Y" on screen until the first
// interaction of the new day. Quiet beats are two compares (TTL + date stamp).
const FOCUS_TOTAL_HEARTBEAT_MS = 60000;
// Delay between the music iframe's load event and the "listening" handshake.
// The embed isn't ready to register listeners the instant it loads (Vidstack
// ships the same ~100ms wait).
const MUSIC_LISTENING_DELAY_MS = 100;
// Music ducking: while a sound cue plays, the lofi music dips to
// MUSIC_DUCK_FACTOR × the user's volume (multiplicative, so "Low" never jumps
// louder), then eases back. The embed's setVolume has no native fade, so both
// ramps are stepped — one post per MUSIC_DUCK_STEP_MS.
const MUSIC_DUCK_FACTOR = 0.35;
const MUSIC_DUCK_DOWN_MS = 240;
const MUSIC_DUCK_UP_MS = 800;
const MUSIC_DUCK_STEP_MS = 60;
// Music fades: ♪ play eases the volume up from silence, ⏸ pause and ⏹ stop ease
// it down to silence *before* the pause/stop command is posted (posting it
// first would cut the audio dead, which is the jolt the fade exists to remove).
// The out-fade therefore delays the actual pause, so it is the shorter of the
// two — long enough to smooth the edge, short enough that the button still
// feels immediate. (The duck's ramps are asymmetric too, but for its own
// reason: its down-ramp is a race to get under the cue's attack, and it delays
// nothing.) The curve is eased rather than linear — see buildFadeRamp in
// youtubeMusic.ts. The step interval is shorter than the duck's, which is what
// keeps a fade covering the whole volume range from stepping much more coarsely
// than the duck's short dip does.
const MUSIC_FADE_IN_MS = 800;
const MUSIC_FADE_OUT_MS = 450;
const MUSIC_FADE_STEP_MS = 50;
// A fade-in waits for playback to actually start before it runs, which means it
// waits on the embed. If the embed never starts — iOS refusing a first play
// without an in-iframe tap, a dropped command, a dead video — the wait must not
// be forever: the player would sit silently at volume 0. After this long the
// fade stands down and the user's volume goes back on (inaudible while nothing
// is playing, and it puts the volume control back in charge).
const MUSIC_FADE_ARM_TIMEOUT_MS = 5000;
// A fade-in only advances while audio is actually flowing, so a mid-fade
// rebuffer stretches it rather than being spent on silence — the resume seek
// from 0.5.3 rebuffers on exactly this boundary. Bounded so a player that never
// comes back can't leave the ramp parked half-way up.
const MUSIC_FADE_HOLD_MAX_MS = 3000;
// How long an ENDED player state must persist before the "music ended" Notice
// fires. Playlist auto-advance and loop restarts pass through ENDED and resume
// within ~a second — only a lone, lasting ENDED (finished video with loop off,
// or a live stream going offline) should surface to the user.
const MUSIC_ENDED_NOTICE_DELAY_MS = 3000;
// How long a BUFFERING player state must persist before the "music is
// buffering" Notice fires (normal track starts and brief rebuffers stay well
// under this), and the minimum gap between such notices — a flapping
// connection stalls repeatedly and must not turn the panel into a nag.
const MUSIC_STALL_NOTICE_DELAY_MS = 10000;
const MUSIC_STALL_RENOTIFY_MS = 300000;
// How often a changed music position is written to data.json while playback
// runs. The embed reports its clock ~4Hz, so the position is tracked in memory
// and only *persisted* on boundaries (pause, stop, track end, panel close,
// plugin unload) — this interval is the crash/force-quit safety net, and it
// writes nothing when the position hasn't moved since the last save. Keeping it
// slow matters: data.json lives in the vault, so every write is sync traffic.
const MUSIC_POSITION_SAVE_MS = 60000;
// How far below a posted resume seek the reported clock may be and still count
// as "the seek landed". The embed keeps reporting the pre-seek position for a
// beat after the command, and those readings must not overwrite the position
// being resumed to.
const RESUME_SEEK_LANDING_TOLERANCE_S = 5;
// Default settings used on first load or when a setting is missing.
const DEFAULT_SETTINGS = {
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartBreak: false,
    autoStartFocus: false,
    autoOpenOnStartup: true,
    showInStatusBar: true,
    showStatusBarTimeLeft: false,
    showDayNightIndicator: true,
    showEndTime: true,
    theme: "classic",
    soundEnabled: true,
    soundVolume: 0.7,
    tasksPath: "",
    logFolderPath: "",
    showTaskSelector: true,
    taskSelectorDays: 3,
    dailyFocusGoalMinutes: 120,
    goalNoticeEnabled: true,
    incrementPomodoroCountOnFinish: false,
    musicUrl: "",
    showMusicPlayer: true,
    musicVolume: 0.7,
    musicLoop: true,
    musicResume: true,
    lastGoalHitDate: null,
    sessionsSinceLongBreak: 0,
    sessionCounterDate: null,
    lastMusicVideoId: null,
    lastMusicPlaylistId: null,
    lastMusicSeconds: 0,
};

// Pure helpers for the lofi-music feature: YouTube URL parsing, embed-URL
// construction, and the postMessage protocol spoken to a YouTube embed.
//
// The embed is controlled WITHOUT loading YouTube's remote iframe_api script
// (remote code in the plugin context is the one thing Obsidian review hard-bans).
// Instead we speak the same wire protocol that script wraps: an iframe loaded
// with `enablejsapi=1`, a one-time `{"event":"listening"}` handshake after the
// iframe's load event, then `{"event":"command","func":...,"args":[...]}`
// strings via contentWindow.postMessage. The embed streams back onReady /
// onStateChange / infoDelivery / onError messages. This is the exact approach
// Vidstack (and therefore Media Extended) ships to thousands of Obsidian users.
//
// No `obsidian` or DOM imports — everything here is unit-testable under
// vitest's node environment (URL/URLSearchParams are Node globals).
// Embeds use the nocookie domain: same protocol, no cookies until playback
// starts, and fewer "error 153" rejections (it's also Obsidian core's default
// for markdown-embedded YouTube since 1.10.2).
const YT_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
// Origins the embed may legitimately message us from. Depending on the video,
// the player can bounce through www.youtube.com even on a nocookie embed.
const YT_ALLOWED_MESSAGE_ORIGINS = [
    YT_EMBED_ORIGIN,
    "https://www.youtube.com",
];
// Player states reported by the embed (the IFrame API's YT.PlayerState values).
const YT_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3};
// Positions below this are not worth resuming — the user effectively just
// started the track, and `start=1` only adds noise to the embed URL.
const MUSIC_RESUME_MIN_SECONDS = 5;
// Don't remember a position this close to the end: the track is finished for
// all practical purposes, so the next session should open it from the top.
const MUSIC_RESUME_END_MARGIN_SECONDS = 10;
// Video IDs are exactly 11 chars from this alphabet.
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
// Playlist IDs vary in length (PL/RD/UU/OL prefixes); validate loosely.
const PLAYLIST_ID_REGEX = /^[A-Za-z0-9_-]{2,}$/;
// t=/start= values: plain seconds ("90"), or 1h2m3s-style components.
const CLOCK_TIME_REGEX = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;
// Hostnames we accept, after stripping a leading "www." / "m.".
const ALLOWED_HOSTS = new Set([
    "youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
]);
// Channel-page path heads that *look* like stream links but carry no video ID
// (client-side resolution would need the Data API). Rejected with a specific
// validation message pointing users at the watch/live URL instead.
const CHANNEL_PATH_HEADS = new Set(["channel", "c", "user"]);
/**
 * Normalize a t=/start= value to whole seconds. Accepts plain seconds ("90"),
 * an "s" suffix ("90s"), and clock components ("2m", "1h2m3s"). Returns null
 * for anything unparsable so callers can just drop the offset.
 */
function parseStartTime(raw) {
    const value = raw.trim();
    if (value === "")
        return null;
    if (/^\d+$/.test(value))
        return parseInt(value, 10);
    const match = value.match(CLOCK_TIME_REGEX);
    if (!match || (match[1] === undefined && match[2] === undefined && match[3] === undefined)) {
        return null;
    }
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    return hours * 3600 + minutes * 60 + seconds;
}
/**
 * Extract an embeddable target from a user-pasted YouTube URL. Handles all the
 * shapes people actually paste — watch?v=, youtu.be/, /live/ (live streams),
 * /shorts/, /embed/, legacy /v/, playlist?list=, music.youtube.com, m., and
 * scheme-less input — and returns null for anything that can't be resolved to
 * a video or playlist ID client-side (non-YouTube hosts, channel /live pages,
 * malformed IDs).
 */
function parseYouTubeUrl(raw) {
    var _a, _b;
    const trimmed = raw.trim();
    if (trimmed === "")
        return null;
    let url;
    try {
        // Tolerate scheme-less pastes ("youtube.com/watch?v=…").
        url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    }
    catch (_c) {
        return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:")
        return null;
    const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    if (!ALLOWED_HOSTS.has(host))
        return null;
    const segments = url.pathname.split("/").filter((s) => s !== "");
    const rawStart = (_a = url.searchParams.get("start")) !== null && _a !== void 0 ? _a : url.searchParams.get("t");
    const startSeconds = rawStart !== null ? parseStartTime(rawStart) : null;
    const rawList = url.searchParams.get("list");
    const playlistId = rawList !== null && PLAYLIST_ID_REGEX.test(rawList) ? rawList : null;
    const asTarget = (videoId) => {
        if (videoId === undefined || !VIDEO_ID_REGEX.test(videoId))
            return null;
        return { videoId, playlistId, startSeconds };
    };
    // Short links: the ID is the first path segment.
    if (host === "youtu.be")
        return asTarget(segments[0]);
    const head = segments[0];
    switch (head) {
        case "watch":
            return asTarget((_b = url.searchParams.get("v")) !== null && _b !== void 0 ? _b : undefined);
        case "live":
        case "shorts":
        case "v":
            return asTarget(segments[1]);
        case "embed":
            // An already-built playlist embed is accepted as a playlist target.
            if (segments[1] === "videoseries") {
                return playlistId !== null ? { videoId: null, playlistId, startSeconds } : null;
            }
            return asTarget(segments[1]);
        case "playlist":
            return playlistId !== null ? { videoId: null, playlistId, startSeconds } : null;
        default:
            // @handle/live, /channel/…/live, /c/…, /user/… — no resolvable ID.
            return null;
    }
}
/**
 * Settings-tab validation for the music URL. Empty is valid (feature unset —
 * this also runs against the seeded value on mount, which must not error).
 * Channel-style links get a targeted hint; everything else unparsable gets
 * generic guidance.
 */
function validateMusicUrl(raw) {
    var _a;
    const trimmed = raw.trim();
    if (trimmed === "")
        return undefined;
    if (parseYouTubeUrl(trimmed) !== null)
        return undefined;
    try {
        const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
        const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
        const segments = url.pathname.split("/").filter((s) => s !== "");
        const head = (_a = segments[0]) !== null && _a !== void 0 ? _a : "";
        if (ALLOWED_HOSTS.has(host) && (head.startsWith("@") || CHANNEL_PATH_HEADS.has(head))) {
            return "Channel /live links can't be embedded — open the stream and copy its watch URL instead.";
        }
    }
    catch (_b) {
        // Fall through to the generic message.
    }
    return "Paste a YouTube video, live stream, or playlist link, e.g. https://www.youtube.com/watch?v=…";
}
/**
 * Build the hidden-embed URL for a parsed target. `controls=0` because the
 * player is never visible; `playsinline=1` keeps iOS from going fullscreen;
 * no `origin=` param — Obsidian's page origin (app://obsidian.md) isn't a
 * valid https origin, and the param is optional hardening (Vidstack omits it).
 *
 * `loop` replays the video/playlist when it ends. YouTube's documented quirk:
 * `loop=1` only works when a `playlist` param is present, so a single video
 * loops via `playlist=<its own id>`. Live streams ignore it (nothing to loop).
 */
function buildEmbedUrl(target, loop = false) {
    const params = new URLSearchParams({
        enablejsapi: "1",
        playsinline: "1",
        rel: "0",
        controls: "0",
    });
    if (target.playlistId !== null)
        params.set("list", target.playlistId);
    if (target.startSeconds !== null && target.startSeconds > 0) {
        params.set("start", String(Math.floor(target.startSeconds)));
    }
    if (loop) {
        params.set("loop", "1");
        if (target.playlistId === null && target.videoId !== null) {
            params.set("playlist", target.videoId);
        }
    }
    const path = target.videoId !== null ? `/embed/${target.videoId}` : "/embed/videoseries";
    return `${YT_EMBED_ORIGIN}${path}?${params.toString()}`;
}
/**
 * Whether a reported playback position is worth *recording*. Rejects the last
 * few seconds of a track (it's finished — the next session should open it at
 * the top) and anything whose duration is not positive, which is how the embed
 * reports a live stream: a DVR offset means nothing on a stream, and `start=`
 * is ignored for one anyway.
 *
 * Note there is no floor here — the "too near the start to bother resuming"
 * rule belongs to planResume, on the apply side. Recording the opening
 * seconds is what lets a restarted or looped track immediately overwrite a
 * stale offset instead of leaving it standing for the first few seconds.
 */
function isResumablePosition(seconds, duration) {
    if (!Number.isFinite(seconds) || seconds < 0)
        return false;
    if (duration === null || !Number.isFinite(duration) || duration <= 0)
        return false;
    return seconds <= duration - MUSIC_RESUME_END_MARGIN_SECONDS;
}
/**
 * Work out how to reopen `target` at a remembered position.
 *
 * The offset is deliberately **not** folded into the embed URL as `start=`.
 * That was 0.5.3's first cut and it broke playback: an embed loaded with
 * `start=` (alongside the loop feature's `loop=1&playlist=<self>`) stops
 * responding to `playVideo` after a pause — the player only recovers on
 * `stopVideo`. Keeping the URL byte-identical to what 0.5.2 built means
 * playback, looping, stop and close-the-panel all behave exactly as before,
 * and resume becomes purely additive: one `seekTo` once the player is running,
 * which is also the only state YouTube documents as safe to seek from.
 *
 * The playlist *item* still has to come from the URL, since seeking cannot
 * cross items — but `/embed/<id>?list=<list>` is the same shape a watch+list
 * URL already produced in 0.5.0, so it is not new ground. Resume is keyed by
 * video ID rather than playlist index: the ID still identifies the right item
 * after the playlist is reordered, and it avoids `index=` being 1-based while
 * the embed reports `playlistIndex` 0-based.
 */
function planResume(target, saved) {
    const none = { target, seekSeconds: null };
    if (saved === null)
        return none;
    const { videoId, seconds } = saved;
    // Defensive: data.json is user-editable and survives across versions.
    if (videoId === null || !VIDEO_ID_REGEX.test(videoId))
        return none;
    if (!Number.isFinite(seconds) || seconds < MUSIC_RESUME_MIN_SECONDS)
        return none;
    // The playlist context must match exactly — both standalone, or the same list.
    if (saved.playlistId !== target.playlistId)
        return none;
    // Outside a playlist the saved video must be the one the URL names. Inside
    // one the saved video wins: the list has advanced past the URL's own video.
    if (target.playlistId === null && target.videoId !== videoId)
        return none;
    const seekSeconds = Math.floor(seconds);
    // Same video: hand back the very same target object, so callers can use an
    // identity check to see whether the embed URL itself changed.
    if (target.videoId === videoId)
        return { target, seekSeconds };
    return { target: Object.assign(Object.assign({}, target), { videoId }), seekSeconds };
}
/**
 * Serialize a player command. The embed expects a JSON *string*, not an
 * object: {"event":"command","func":"playVideo","args":[]}.
 */
function buildPlayerCommand(func, args) {
    return JSON.stringify({ event: "command", func, args: args !== null && args !== void 0 ? args : [] });
}
/**
 * The one-time handshake posted after the iframe loads; without it the embed
 * never starts streaming events back.
 */
function buildListeningMessage() {
    return JSON.stringify({ event: "listening" });
}
/** Read a finite number field off an infoDelivery payload, else null. */
function numberField(fields, key) {
    const value = fields[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
/**
 * Decode a `message` event payload from the embed. Anything that isn't a JSON
 * string in one of the known shapes returns null — window message traffic is
 * a shared bus, so this must never throw on foreign data. (Callers should
 * already have checked event.source/event.origin before parsing.)
 */
function parsePlayerMessage(data) {
    if (typeof data !== "string")
        return null;
    let parsed;
    try {
        parsed = JSON.parse(data);
    }
    catch (_a) {
        return null;
    }
    if (typeof parsed !== "object" || parsed === null)
        return null;
    const msg = parsed;
    switch (msg.event) {
        case "onReady":
            return { type: "ready" };
        case "onStateChange":
            return typeof msg.info === "number" ? { type: "state", state: msg.info } : null;
        case "onError": {
            const code = typeof msg.info === "number" ? msg.info : Number(msg.info);
            return Number.isFinite(code) ? { type: "error", code } : null;
        }
        case "infoDelivery": {
            // The workhorse event: fires continuously with {info:{playerState,
            // currentTime, duration, videoData:{video_id}, …}} — never all at once.
            const info = msg.info;
            if (typeof info !== "object" || info === null)
                return null;
            const fields = info;
            const state = numberField(fields, "playerState");
            const currentTime = numberField(fields, "currentTime");
            const duration = numberField(fields, "duration");
            let videoId = null;
            const videoData = fields.videoData;
            if (typeof videoData === "object" && videoData !== null) {
                const id = videoData.video_id;
                if (typeof id === "string" && VIDEO_ID_REGEX.test(id))
                    videoId = id;
            }
            // Nothing we track — a volume/quality/loadedFraction-only delivery.
            if (state === null && currentTime === null && duration === null && videoId === null) {
                return null;
            }
            return { type: "info", state, currentTime, duration, videoId };
        }
        default:
            return null;
    }
}
/**
 * Map the stored 0–1 music volume onto the embed's 0–100 setVolume scale.
 */
function musicVolumeTo100(volume01) {
    return Math.round(Math.min(1, Math.max(0, volume01)) * 100);
}
/**
 * Volume levels for a stepped ramp between two 0–1 volumes: `steps` evenly
 * spaced values that exclude `from01` and land exactly on `to01`. The embed's
 * setVolume has no native fade, so the ducking ramps post one of these per
 * step interval. Inputs are clamped to [0, 1]; `steps` is floored to ≥ 1.
 */
function buildVolumeRamp(from01, to01, steps) {
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const from = clamp(from01);
    const to = clamp(to01);
    const count = Math.max(1, Math.floor(steps));
    const levels = [];
    for (let i = 1; i < count; i++) {
        levels.push(from + ((to - from) * i) / count);
    }
    levels.push(to); // exact landing — no float drift on the final value
    return levels;
}
/**
 * Volume levels for a *fade* between two 0–1 volumes. Same contract as
 * buildVolumeRamp — `steps` values excluding `from01`, landing exactly on
 * `to01` — but eased instead of linear.
 *
 * A fade runs all the way to or from silence, and loudness is perceived
 * roughly logarithmically: a linear amplitude ramp spends half its time inside
 * the top 6 dB, so it sounds like the music snaps in and then hangs there. The
 * curve is therefore weighted quadratically toward the *quiet* end — halfway
 * through, the level sits a quarter of the way up from it — which spreads the
 * audible change evenly across the fade. A fade-out is the exact mirror of the
 * fade-in that undoes it, since progress is always measured from the quiet end.
 *
 * Ducking deliberately keeps the linear buildVolumeRamp: it moves between two
 * audible levels, where this curve would only make the dip feel late.
 */
function buildFadeRamp(from01, to01, steps) {
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const from = clamp(from01);
    const to = clamp(to01);
    const count = Math.max(1, Math.floor(steps));
    const rising = to >= from;
    const quiet = rising ? from : to;
    const loud = rising ? to : from;
    const levels = [];
    for (let i = 1; i < count; i++) {
        // Distance from the quiet end, in normalized time, squared.
        const t = i / count;
        const progress = rising ? t : 1 - t;
        levels.push(quiet + (loud - quiet) * progress * progress);
    }
    levels.push(to); // exact landing — a fade-out must reach true silence
    return levels;
}

// Shared between the declarative (1.13+) and imperative (pre-1.13) paths so
// the two can't drift.
const POMO_COUNT_TOGGLE_DESC = "Beta — edits your task files. Adds a lifetime '🍅 N' marker to the task line each time a linked focus session ends.";
const MUSIC_RESUME_DESC = "Reopen the music where you paused or left it, including after quitting Obsidian. Press ⏹ to start from the top next time. Live streams always start live.";
const CHECK_MARKERS_NAME = "Check for misplaced pomodoro count markers";
const CHECK_MARKERS_DESC = "Counts markers misplaced by versions before 0.5.1, changing nothing. Affected files are listed in the developer console.";
const REPAIR_MARKERS_NAME = "Repair misplaced pomodoro count markers";
const REPAIR_MARKERS_DESC = "Moves misplaced markers back in front of the Tasks fields, keeping their counts. Asks for confirmation first.";
const REMOVE_MARKERS_NAME = "Remove misplaced pomodoro count markers";
const REMOVE_MARKERS_DESC = "Deletes misplaced markers instead, losing their counts. Asks for confirmation first.";
const REMOVE_ALL_MARKERS_NAME = "Remove all pomodoro count markers";
const REMOVE_ALL_MARKERS_DESC = "Risky — deletes every 🍅 marker the counter has written, losing all counts, and cannot be undone. Back up your vault first. Asks for confirmation.";
class GentlePomoSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    applySettingsToOpenViews() {
        const hasApplySettings = (view) => {
            if (!view || typeof view !== "object")
                return false;
            return ("applySettings" in view &&
                typeof view.applySettings === "function");
        };
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GENTLE_POMO);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (hasApplySettings(view))
                view.applySettings();
        }
    }
    getSettingDefinitions() {
        return [
            {
                type: "group",
                heading: "Display & behavior",
                items: [
                    {
                        name: "Pomodoro logs folder",
                        desc: "Folder to store daily log files (e.g., 'pomodoro_logs').",
                        control: { type: "text", key: "logFolderPath", placeholder: "Example: pomodoro_logs" },
                    },
                    {
                        name: "Auto-open on startup",
                        desc: "Open the view in the right panel when Obsidian starts.",
                        control: { type: "toggle", key: "autoOpenOnStartup" },
                    },
                    {
                        name: "Show status bar",
                        desc: "Show the status bar indicator.",
                        control: { type: "toggle", key: "showInStatusBar" },
                    },
                ],
            },
            {
                type: "group",
                heading: "Timer appearance",
                items: [
                    {
                        name: "Theme",
                        desc: "Visual style for the timer.",
                        control: {
                            type: "dropdown",
                            key: "theme",
                            options: { classic: "Classic", "frosted-glass": "Frosted glass" },
                        },
                    },
                    {
                        name: "Day/night indicator",
                        desc: "Show a subtle sun/moon indicator above the timer.",
                        control: { type: "toggle", key: "showDayNightIndicator" },
                    },
                    {
                        name: "Show estimated end time",
                        desc: "Show the projected finish time on the timer while a session is running.",
                        control: { type: "toggle", key: "showEndTime" },
                    },
                ],
            },
            {
                type: "group",
                heading: "Music",
                items: [
                    {
                        name: "YouTube music URL",
                        desc: "Paste a YouTube video, live stream, or playlist link. Audio plays in the timer panel — the video is never shown.",
                        control: {
                            type: "text",
                            key: "musicUrl",
                            placeholder: "Paste a YouTube link",
                            validate: (value) => validateMusicUrl(String(value !== null && value !== void 0 ? value : "")),
                        },
                    },
                    {
                        name: "Show music player",
                        desc: "Show the music controls in the timer panel. Turning this off also stops playback.",
                        control: { type: "toggle", key: "showMusicPlayer" },
                    },
                    {
                        name: "Loop music",
                        desc: "Replay the video or playlist from the start when it ends. Live streams aren't affected. Changing this reloads the player.",
                        control: { type: "toggle", key: "musicLoop" },
                    },
                    {
                        name: "Resume where you left off",
                        desc: MUSIC_RESUME_DESC,
                        control: { type: "toggle", key: "musicResume" },
                    },
                ],
            },
            {
                type: "group",
                heading: "Long break",
                items: [
                    {
                        name: "Long break duration (minutes)",
                        desc: "Length of the long break that replaces a regular break.",
                        control: { type: "number", key: "longBreakMinutes", min: 1 },
                    },
                    {
                        name: "Long break frequency",
                        desc: "Number of focus sessions before each long break (classic technique uses 4).",
                        control: { type: "number", key: "longBreakEvery", min: 1 },
                    },
                ],
            },
            {
                type: "group",
                heading: "Daily focus goal",
                items: [
                    {
                        name: "Daily focus goal (minutes)",
                        desc: "Set to 0 to disable. The status bar shows today's progress against this goal.",
                        control: { type: "number", key: "dailyFocusGoalMinutes", min: 0 },
                    },
                    {
                        name: "Goal-hit notice",
                        desc: "Show a one-time notice when today's focus first crosses the daily goal.",
                        control: { type: "toggle", key: "goalNoticeEnabled" },
                    },
                ],
            },
            {
                type: "group",
                heading: "Task selector",
                items: [
                    {
                        name: "Tasks folder path",
                        desc: "Folder to search for tasks (e.g., 'daily notes'). Leave empty to search the entire vault.",
                        control: { type: "text", key: "tasksPath", placeholder: "Example: projects/active" },
                    },
                    {
                        name: "Show task selector",
                        desc: "Show the task picker in the timer panel. Turning this off unlinks the current task.",
                        control: { type: "toggle", key: "showTaskSelector" },
                    },
                    {
                        name: "Task lookahead window",
                        desc: "How many days ahead the task selector shows scheduled/due tasks. Overdue tasks always appear.",
                        control: {
                            type: "dropdown",
                            key: "taskSelectorDays",
                            options: {
                                "3": "3 Days",
                                "5": "5 Days",
                                "7": "7 Days",
                                "14": "14 Days",
                                "30": "30 Days",
                            },
                        },
                    },
                ],
            },
            {
                type: "group",
                heading: "Task integration",
                items: [
                    {
                        name: "Increment task pomodoro count on finish",
                        desc: POMO_COUNT_TOGGLE_DESC,
                        control: { type: "toggle", key: "incrementPomodoroCountOnFinish" },
                    },
                    {
                        name: CHECK_MARKERS_NAME,
                        desc: CHECK_MARKERS_DESC,
                        action: () => {
                            void this.plugin.checkPomodoroMarkers();
                        },
                    },
                    {
                        name: REPAIR_MARKERS_NAME,
                        desc: REPAIR_MARKERS_DESC,
                        action: () => {
                            void this.plugin.repairPomodoroMarkers();
                        },
                    },
                    {
                        name: REMOVE_MARKERS_NAME,
                        desc: REMOVE_MARKERS_DESC,
                        action: () => {
                            void this.plugin.removeMisplacedPomodoroMarkers();
                        },
                    },
                    {
                        name: REMOVE_ALL_MARKERS_NAME,
                        desc: REMOVE_ALL_MARKERS_DESC,
                        action: () => {
                            void this.plugin.removeAllPomodoroMarkers();
                        },
                    },
                ],
            },
        ];
    }
    getControlValue(key) {
        // The lookahead dropdown persists a number but renders string option keys.
        if (key === "taskSelectorDays")
            return this.plugin.settings.taskSelectorDays.toString();
        return this.plugin.settings[key];
    }
    setControlValue(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const settings = this.plugin.settings;
            switch (key) {
                case "tasksPath":
                    settings.tasksPath = String(value);
                    break;
                case "showTaskSelector": {
                    const show = Boolean(value);
                    settings.showTaskSelector = show;
                    yield this.plugin.saveSettings();
                    if (!show && this.plugin.timer.currentTaskName !== NO_TASK_LABEL) {
                        this.plugin.timer.setTask(NO_TASK_LABEL);
                    }
                    this.applySettingsToOpenViews();
                    return;
                }
                case "taskSelectorDays": {
                    const n = parseInt(String(value), 10);
                    if (!Number.isFinite(n) || n <= 0)
                        return;
                    settings.taskSelectorDays = n;
                    break;
                }
                case "logFolderPath":
                    settings.logFolderPath = String(value);
                    break;
                case "autoOpenOnStartup":
                    settings.autoOpenOnStartup = Boolean(value);
                    break;
                case "showInStatusBar":
                    yield this.plugin.setStatusBarVisibility(Boolean(value));
                    return;
                case "showDayNightIndicator":
                    settings.showDayNightIndicator = Boolean(value);
                    yield this.plugin.saveSettings();
                    this.applySettingsToOpenViews();
                    return;
                case "showEndTime":
                    settings.showEndTime = Boolean(value);
                    yield this.plugin.saveSettings();
                    this.applySettingsToOpenViews();
                    return;
                case "musicUrl":
                    // Invalid URLs never reach here on 1.13+ — the control's validate hook
                    // rejects them inline. The view rebuilds its iframe via applySettings.
                    settings.musicUrl = String(value).trim();
                    yield this.plugin.saveSettings();
                    this.applySettingsToOpenViews();
                    return;
                case "showMusicPlayer":
                    // The view-side reconciliation removes the iframe when this goes off —
                    // that removal is what stops playback (no timer/engine side effect).
                    settings.showMusicPlayer = Boolean(value);
                    yield this.plugin.saveSettings();
                    this.applySettingsToOpenViews();
                    return;
                case "musicLoop":
                    // Loop is baked into the embed URL, so the view rebuilds the iframe
                    // (stopping any current playback) when this flips.
                    settings.musicLoop = Boolean(value);
                    yield this.plugin.saveSettings();
                    this.applySettingsToOpenViews();
                    return;
                case "musicResume":
                    settings.musicResume = Boolean(value);
                    // Turning it off drops the remembered position (which also saves).
                    if (settings.musicResume)
                        yield this.plugin.saveSettings();
                    else
                        this.plugin.clearMusicPosition();
                    return;
                case "theme":
                    settings.theme = value === "frosted-glass" ? "frosted-glass" : "classic";
                    yield this.plugin.saveSettings();
                    this.applySettingsToOpenViews();
                    return;
                case "longBreakMinutes": {
                    const n = Number(value);
                    if (!Number.isFinite(n) || n <= 0)
                        return;
                    settings.longBreakMinutes = Math.floor(n);
                    break;
                }
                case "longBreakEvery": {
                    const n = Number(value);
                    if (!Number.isFinite(n) || n < 1)
                        return;
                    settings.longBreakEvery = Math.floor(n);
                    break;
                }
                case "dailyFocusGoalMinutes": {
                    const n = Number(value);
                    if (!Number.isFinite(n) || n < 0)
                        return;
                    settings.dailyFocusGoalMinutes = Math.floor(n);
                    break;
                }
                case "goalNoticeEnabled":
                    settings.goalNoticeEnabled = Boolean(value);
                    break;
                case "incrementPomodoroCountOnFinish":
                    settings.incrementPomodoroCountOnFinish = Boolean(value);
                    break;
                default:
                    return;
            }
            yield this.plugin.saveSettings();
        });
    }
    // Fallback for Obsidian < 1.13.0 (minAppVersion is below that). Never called
    // on 1.13+, where the tab renders declaratively from getSettingDefinitions()
    // — keep both paths in sync when adding or changing a setting.
    display() {
        const { containerEl } = this;
        containerEl.empty();
        const applySettingsToOpenViews = () => this.applySettingsToOpenViews();
        new obsidian.Setting(containerEl).setName("Display & behavior").setHeading();
        new obsidian.Setting(containerEl)
            .setName("Pomodoro logs folder")
            .setDesc("Folder to store daily log files (e.g., 'pomodoro_logs').")
            .addText((text) => text
            .setPlaceholder("Example: pomodoro_logs")
            .setValue(this.plugin.settings.logFolderPath)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.logFolderPath = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName("Auto-open on startup")
            .setDesc("Open the view in the right panel when Obsidian starts.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.autoOpenOnStartup).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.autoOpenOnStartup = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName("Show status bar")
            .setDesc("Show the status bar indicator.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.showInStatusBar).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.setStatusBarVisibility(value);
        })));
        new obsidian.Setting(containerEl).setName("Timer appearance").setHeading();
        new obsidian.Setting(containerEl)
            .setName("Theme")
            .setDesc("Visual style for the timer.")
            .addDropdown((dropdown) => dropdown
            .addOption("classic", "Classic")
            .addOption("frosted-glass", "Frosted glass")
            .setValue(this.plugin.settings.theme)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.theme = value;
            yield this.plugin.saveSettings();
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl)
            .setName("Day/night indicator")
            .setDesc("Show a subtle sun/moon indicator above the timer.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.showDayNightIndicator).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.showDayNightIndicator = value;
            yield this.plugin.saveSettings();
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl)
            .setName("Show estimated end time")
            .setDesc("Show the projected finish time on the timer while a session is running.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.showEndTime).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.showEndTime = value;
            yield this.plugin.saveSettings();
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl).setName("Music").setHeading();
        new obsidian.Setting(containerEl)
            .setName("YouTube music URL")
            .setDesc("Paste a YouTube video, live stream, or playlist link. Audio plays in the timer panel — the video is never shown.")
            .addText((text) => text
            .setPlaceholder("Paste a YouTube link")
            .setValue(this.plugin.settings.musicUrl)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            // No validate hook pre-1.13 — an unparsable URL simply hides the
            // music section view-side (parseYouTubeUrl returns null).
            this.plugin.settings.musicUrl = value.trim();
            yield this.plugin.saveSettings();
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl)
            .setName("Show music player")
            .setDesc("Show the music controls in the timer panel. Turning this off also stops playback.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.showMusicPlayer).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.showMusicPlayer = value;
            yield this.plugin.saveSettings();
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl)
            .setName("Loop music")
            .setDesc("Replay the video or playlist from the start when it ends. Live streams aren't affected. Changing this reloads the player.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.musicLoop).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.musicLoop = value;
            yield this.plugin.saveSettings();
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl)
            .setName("Resume where you left off")
            .setDesc(MUSIC_RESUME_DESC)
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.musicResume).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.musicResume = value;
            // Turning it off drops the remembered position (which also saves).
            if (value)
                yield this.plugin.saveSettings();
            else
                this.plugin.clearMusicPosition();
        })));
        new obsidian.Setting(containerEl).setName("Long break").setHeading();
        new obsidian.Setting(containerEl)
            .setName("Long break duration (minutes)")
            .setDesc("Length of the long break that replaces a regular break.")
            .addText((text) => text.setValue(this.plugin.settings.longBreakMinutes.toString()).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const n = parseInt(value, 10);
            if (Number.isFinite(n) && n > 0) {
                this.plugin.settings.longBreakMinutes = n;
                yield this.plugin.saveSettings();
            }
        })));
        new obsidian.Setting(containerEl)
            .setName("Long break frequency")
            .setDesc("Number of focus sessions before each long break (classic technique uses 4).")
            .addText((text) => text.setValue(this.plugin.settings.longBreakEvery.toString()).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const n = parseInt(value, 10);
            if (Number.isFinite(n) && n >= 1) {
                this.plugin.settings.longBreakEvery = n;
                yield this.plugin.saveSettings();
            }
        })));
        new obsidian.Setting(containerEl).setName("Daily focus goal").setHeading();
        new obsidian.Setting(containerEl)
            .setName("Daily focus goal (minutes)")
            .setDesc("Set to 0 to disable. The status bar shows today's progress against this goal.")
            .addText((text) => text
            .setValue(this.plugin.settings.dailyFocusGoalMinutes.toString())
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const n = parseInt(value, 10);
            if (Number.isFinite(n) && n >= 0) {
                this.plugin.settings.dailyFocusGoalMinutes = n;
                yield this.plugin.saveSettings();
            }
        })));
        new obsidian.Setting(containerEl)
            .setName("Goal-hit notice")
            .setDesc("Show a one-time notice when today's focus first crosses the daily goal.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.goalNoticeEnabled).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.goalNoticeEnabled = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl).setName("Task selector").setHeading();
        new obsidian.Setting(containerEl)
            .setName("Tasks folder path")
            .setDesc("Folder to search for tasks (e.g., 'daily notes'). Leave empty to search the entire vault.")
            .addText((text) => text
            .setPlaceholder("Example: projects/active")
            .setValue(this.plugin.settings.tasksPath)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.tasksPath = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName("Show task selector")
            .setDesc("Show the task picker in the timer panel. Turning this off unlinks the current task.")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.showTaskSelector).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.showTaskSelector = value;
            yield this.plugin.saveSettings();
            if (!value && this.plugin.timer.currentTaskName !== NO_TASK_LABEL) {
                this.plugin.timer.setTask(NO_TASK_LABEL);
            }
            applySettingsToOpenViews();
        })));
        new obsidian.Setting(containerEl)
            .setName("Task lookahead window")
            .setDesc("How many days ahead the task selector shows scheduled/due tasks. Overdue tasks always appear.")
            .addDropdown((dropdown) => dropdown
            .addOption("3", "3 Days")
            .addOption("5", "5 Days")
            .addOption("7", "7 Days")
            .addOption("14", "14 Days")
            .addOption("30", "30 Days")
            .setValue(this.plugin.settings.taskSelectorDays.toString())
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const n = parseInt(value, 10);
            if (Number.isFinite(n) && n > 0) {
                this.plugin.settings.taskSelectorDays = n;
                yield this.plugin.saveSettings();
            }
        })));
        new obsidian.Setting(containerEl).setName("Task integration").setHeading();
        new obsidian.Setting(containerEl)
            .setName("Increment task pomodoro count on finish")
            .setDesc(POMO_COUNT_TOGGLE_DESC)
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.incrementPomodoroCountOnFinish)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.incrementPomodoroCountOnFinish = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName(CHECK_MARKERS_NAME)
            .setDesc(CHECK_MARKERS_DESC)
            .addButton((btn) => btn.setButtonText("Check").onClick(() => {
            void this.plugin.checkPomodoroMarkers();
        }));
        new obsidian.Setting(containerEl)
            .setName(REPAIR_MARKERS_NAME)
            .setDesc(REPAIR_MARKERS_DESC)
            .addButton((btn) => btn.setButtonText("Repair").onClick(() => {
            void this.plugin.repairPomodoroMarkers();
        }));
        new obsidian.Setting(containerEl)
            .setName(REMOVE_MARKERS_NAME)
            .setDesc(REMOVE_MARKERS_DESC)
            .addButton((btn) => {
            btn.setButtonText("Remove").onClick(() => {
                void this.plugin.removeMisplacedPomodoroMarkers();
            });
            markDestructive(btn);
        });
        new obsidian.Setting(containerEl)
            .setName(REMOVE_ALL_MARKERS_NAME)
            .setDesc(REMOVE_ALL_MARKERS_DESC)
            .addButton((btn) => {
            btn.setButtonText("Remove all").onClick(() => {
                void this.plugin.removeAllPomodoroMarkers();
            });
            markDestructive(btn);
        });
    }
}

// Tasks-plugin checkbox line, on any bullet Obsidian's list syntax allows:
// `-`, `*`, `+`, or a numbered `1.` / `1)`. The Tasks plugin treats all of
// them as tasks, so a `* [ ]` line renders as a normal task in Obsidian —
// hardcoding `-` here made such tasks silently invisible to the picker, the
// ID lookup, and the 🍅 marker walkers. Group 1 is the status char, group 2
// the text; exported so TimerEngine matches task lines identically.
const TASK_LINE_REGEX = /^\s*(?:[-*+]|\d+[.)])\s*\[( |x)\]\s+(.*)$/i;
const SCHEDULED_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2})/;
const DUE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})/;
const TASK_ID_REGEX$1 = /🆔\s*([A-Za-z0-9_-]+)/;
// Pomodoro count marker. The optional `(...)` group tolerates the legacy
// 0.1.0 today-only format (`🍅 N (YYYY-MM-DD)`) so existing markers are still
// readable — the parens (and any content) get stripped on the next write.
const POMO_MARKER_REGEX = /🍅\s*(\d+)(?:\s*\([^)]*\))?/;
// First Tasks-plugin metadata token on a line (dates, priorities, recurrence,
// ID, plus the Tasks 8.x field emojis this plugin doesn't otherwise read:
// ❌ cancelled, ⛔ depends-on, 🏁 on-completion). The 🍅 marker must be
// inserted BEFORE the first of these: the Tasks plugin only recognizes its
// emoji fields at the end of the line, so any text placed after them silently
// demotes every field to plain description text (GitHub issue #2).
const TASKS_METADATA_TOKEN_REGEX = /[⏳📅🛫➕✅❌⛔🏁🔺🔽🔥⏫⏬🔼🔁🆔]/u;
// Trailing Obsidian block reference (`^block-id`) — must stay at the very end.
const BLOCK_ID_REGEX = /\s+\^[A-Za-z0-9-]+\s*$/;
// Everything that may legitimately follow a plugin-written 🍅 marker: the end
// of the line, a Tasks metadata token, or a trailing block reference. Used to
// tell plugin-written markers (removable) from a `🍅 N` the user typed
// mid-description (kept — ordinary text after the marker rules the plugin out).
const MARKER_TAIL_REGEX = /^\s*(?:$|[⏳📅🛫➕✅❌⛔🏁🔺🔽🔥⏫⏬🔼🔁🆔]|\^[A-Za-z0-9-]+\s*$)/u;
const PRIORITY_REGEX = /[🔺🔽🔥⏫⏬🔼]\uFE0F?/gu;
const VARIATION_SELECTOR_REGEX = /\uFE0F/gu;
// Dates + priorities + recurrence + ID (for canonical task matching)
const CLEANUP_REGEX = /[⏳📅🛫➕✅]\s*\d{4}-\d{2}-\d{2}|[🔺🔽🔥⏫⏬🔼]\uFE0F?\s*\w*|🔁\s*[a-zA-Z0-9\s]+|🆔\s*[A-Za-z0-9_-]+/gu;
// Dates + recurrence + ID + tags (for display, keep priority icons only)
const DISPLAY_CLEANUP_REGEX = /[⏳📅🛫➕✅]\s*\d{4}-\d{2}-\d{2}|🔁\s*[a-zA-Z0-9\s]+|🆔\s*[A-Za-z0-9_-]+|#\S+/gu;
// shared normalization for task text
function normalizeTaskText(text) {
    return text.replace(CLEANUP_REGEX, "").trim();
}
function normalizeTaskTextForDisplay(text) {
    const priorityMatch = text.match(PRIORITY_REGEX);
    let cleaned = text.replace(DISPLAY_CLEANUP_REGEX, "");
    cleaned = cleaned.replace(PRIORITY_REGEX, "");
    cleaned = cleaned.replace(VARIATION_SELECTOR_REGEX, "");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    if (priorityMatch && priorityMatch.length > 0) {
        const priorityIcon = priorityMatch[0].replace(VARIATION_SELECTOR_REGEX, "");
        cleaned = `${cleaned} ${priorityIcon}`.trim();
    }
    return cleaned;
}
/**
 * Returns the line with the lifetime pomodoro count incremented by 1.
 *
 * The marker is written at the end of the task *description* — before the
 * first Tasks-plugin metadata token (⏳ 📅 🆔 priority …) — never after the
 * fields: the Tasks plugin only parses its emoji fields off the end of the
 * line, so a trailing marker turns every field into plain description text
 * and the task's dates vanish from queries and Edit Task (GitHub issue #2).
 *
 * - If marker exists (with or without legacy parens): increment N and
 *   re-insert at the correct position — lines written by ≤0.5.0 (marker
 *   trailing the fields) heal on their next increment. Legacy parens are
 *   stripped on write, so `🍅 N (date)` markers migrate to plain `🍅 N`.
 * - If no marker: insert ` 🍅 1` before the first metadata token, keeping a
 *   trailing block reference (`^block-id`) at the very end of the line.
 */
function incrementPomodoroCount(line) {
    const match = line.match(POMO_MARKER_REGEX);
    if (match && match.index !== undefined) {
        const next = parseInt(match[1], 10) + 1;
        return placePomodoroMarker(removePomodoroMarker(line, match), next);
    }
    return placePomodoroMarker(line, 1);
}
/** Remove a matched 🍅 marker from the line, collapsing the space it leaves. */
function removePomodoroMarker(line, match) {
    var _a;
    const index = (_a = match.index) !== null && _a !== void 0 ? _a : 0;
    return line.slice(0, index).trimEnd() + line.slice(index + match[0].length);
}
/** Insert `🍅 count` at the canonical position in a marker-free line. */
function placePomodoroMarker(stripped, count) {
    const marker = `🍅 ${count}`;
    const metaMatch = stripped.match(TASKS_METADATA_TOKEN_REGEX);
    if (metaMatch && metaMatch.index !== undefined) {
        const head = stripped.slice(0, metaMatch.index).trimEnd();
        return `${head} ${marker} ${stripped.slice(metaMatch.index)}`;
    }
    const blockMatch = stripped.match(BLOCK_ID_REGEX);
    if (blockMatch && blockMatch.index !== undefined) {
        const head = stripped.slice(0, blockMatch.index).trimEnd();
        return `${head} ${marker}${stripped.slice(blockMatch.index)}`;
    }
    return `${stripped.trimEnd()} ${marker}`;
}
/**
 * Locate a 🍅 marker in a *harmful* position — after the first Tasks metadata
 * token (the ≤0.5.0 append bug, which hides every field from the Tasks
 * plugin) or after a trailing `^block-id` (which breaks the block reference).
 *
 * Deliberately conservative: a marker that is merely unusual but harmless
 * (e.g. `🍅 2` mid-description on a line with no Tasks fields) does not
 * count, nor does a line without a marker — both return null.
 */
function findMisplacedPomodoroMarker(line) {
    const match = line.match(POMO_MARKER_REGEX);
    if (!match || match.index === undefined)
        return null;
    const meta = line.match(TASKS_METADATA_TOKEN_REGEX);
    const afterFields = (meta === null || meta === void 0 ? void 0 : meta.index) !== undefined && match.index > meta.index;
    const stripped = removePomodoroMarker(line, match);
    let afterBlockRef = false;
    if (!afterFields) {
        const block = stripped.match(BLOCK_ID_REGEX);
        if ((block === null || block === void 0 ? void 0 : block.index) !== undefined) {
            const token = block[0].trim();
            afterBlockRef = match.index > line.lastIndexOf(token);
        }
    }
    if (!afterFields && !afterBlockRef)
        return null;
    return { count: parseInt(match[1], 10), stripped };
}
/**
 * Repair a task line whose 🍅 marker is misplaced (see
 * {@link findMisplacedPomodoroMarker}): re-insert it at the canonical
 * position. The count is preserved; anything else is left byte-for-byte
 * untouched.
 */
function repairPomodoroMarkerPlacement(line) {
    const misplaced = findMisplacedPomodoroMarker(line);
    if (!misplaced)
        return line;
    return placePomodoroMarker(misplaced.stripped, misplaced.count);
}
/**
 * Delete a misplaced 🍅 marker outright instead of relocating it. Because the
 * ≤0.5.0 bug only ever *appended* the marker, removal restores the line to
 * exactly its pre-bug form (the lifetime count is lost). Correctly placed or
 * harmless markers and marker-less lines are left byte-for-byte untouched.
 */
function removeMisplacedPomodoroMarker(line) {
    const misplaced = findMisplacedPomodoroMarker(line);
    if (!misplaced)
        return line;
    return misplaced.stripped;
}
/**
 * Delete a 🍅 marker whether it is correctly placed or misplaced — the
 * "uninstall" for the counter's data. Only markers in a position the plugin
 * itself writes (followed by nothing but Tasks fields, a block reference, or
 * the end of the line — see MARKER_TAIL_REGEX) are removed; a `🍅 N` the
 * user typed mid-description is left byte-for-byte untouched.
 */
function removeAnyPomodoroMarker(line) {
    const match = line.match(POMO_MARKER_REGEX);
    if (!match || match.index === undefined)
        return line;
    if (!MARKER_TAIL_REGEX.test(line.slice(match.index + match[0].length)))
        return line;
    return removePomodoroMarker(line, match);
}
/** Apply a line transform to every task line (open or completed) in a note. */
function transformTaskLines(content, transform) {
    const lines = content.split("\n");
    let linesChanged = 0;
    for (let i = 0; i < lines.length; i++) {
        if (!TASK_LINE_REGEX.test(lines[i]))
            continue;
        const next = transform(lines[i]);
        if (next !== lines[i]) {
            lines[i] = next;
            linesChanged++;
        }
    }
    return { content: lines.join("\n"), linesChanged };
}
/**
 * Walk the tasks folder (whole vault when the path is empty — same scope the
 * task picker scans) applying a marker transform. With `write: false` this is
 * a pure dry run. With `write: true`, files that need no change are never
 * written; changed files are rewritten atomically via `Vault.process`.
 */
function processPomodoroMarkersInVault(app, tasksPath, transform, write) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = app.vault
            .getFiles()
            .filter((f) => isPathInFolder(f.path, tasksPath) && f.extension === "md");
        let filesAffected = 0;
        let linesAffected = 0;
        const affected = [];
        for (const file of files) {
            const content = yield app.vault.cachedRead(file);
            if (!content.includes("🍅"))
                continue;
            const probe = transformTaskLines(content, transform);
            if (probe.linesChanged === 0)
                continue;
            if (write) {
                yield app.vault.process(file, (data) => transformTaskLines(data, transform).content);
            }
            filesAffected++;
            linesAffected += probe.linesChanged;
            affected.push({ path: file.path, lines: probe.linesChanged });
        }
        return { filesScanned: files.length, filesAffected, linesAffected, affected };
    });
}
/** Dry run: count misplaced 🍅 markers without changing any file. */
function scanMisplacedPomodoroMarkersInVault(app, tasksPath) {
    return processPomodoroMarkersInVault(app, tasksPath, repairPomodoroMarkerPlacement, false);
}
/** Relocate misplaced 🍅 markers in front of the Tasks fields (counts kept). */
function repairPomodoroMarkersInVault(app, tasksPath) {
    return processPomodoroMarkersInVault(app, tasksPath, repairPomodoroMarkerPlacement, true);
}
/** Delete misplaced 🍅 markers, restoring affected lines to their pre-bug form. */
function removeMisplacedPomodoroMarkersInVault(app, tasksPath) {
    return processPomodoroMarkersInVault(app, tasksPath, removeMisplacedPomodoroMarker, true);
}
/** Dry run: count every plugin-written 🍅 marker without changing any file. */
function scanAllPomodoroMarkersInVault(app, tasksPath) {
    return processPomodoroMarkersInVault(app, tasksPath, removeAnyPomodoroMarker, false);
}
/** Delete every plugin-written 🍅 marker, correctly placed or misplaced. */
function removeAllPomodoroMarkersInVault(app, tasksPath) {
    return processPomodoroMarkersInVault(app, tasksPath, removeAnyPomodoroMarker, true);
}
function isPathInFolder(filePath, folderPath) {
    if (!folderPath)
        return true;
    const normalizedFolder = obsidian.normalizePath(folderPath).replace(/\/+$/, "");
    const normalizedPath = obsidian.normalizePath(filePath);
    return normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`);
}
function findTaskNameByIdInContent(content, taskId) {
    if (!taskId)
        return null;
    const lines = content.split("\n");
    for (const line of lines) {
        const lineMatch = line.match(TASK_LINE_REGEX);
        if (!lineMatch)
            continue;
        const idMatch = line.match(TASK_ID_REGEX$1);
        if (!idMatch || idMatch[1] !== taskId)
            continue;
        const cleanText = normalizeTaskText(lineMatch[2]);
        return cleanText || "Untitled Task";
    }
    return null;
}
function findTaskNameById(app, filePath, taskId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!filePath || !taskId)
            return null;
        const file = app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof obsidian.TFile))
            return null;
        const content = yield app.vault.read(file);
        return findTaskNameByIdInContent(content, taskId);
    });
}
function loadTasks(app, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { tasksPath, limitDays = 3 } = options;
        const tasks = [];
        const files = app.vault
            .getFiles()
            .filter((f) => isPathInFolder(f.path, tasksPath) && f.extension === "md");
        const limitDate = moment().add(limitDays, "days").endOf("day");
        for (const file of files) {
            const content = yield app.vault.cachedRead(file);
            const lines = content.split("\n");
            for (const line of lines) {
                const match = line.match(TASK_LINE_REGEX);
                if (!match || match[1] !== " ")
                    continue;
                const originalText = match[2];
                const scheduledMatch = originalText.match(SCHEDULED_REGEX);
                const dueMatch = originalText.match(DUE_REGEX);
                const scheduled = scheduledMatch ? scheduledMatch[1] : null;
                const due = dueMatch ? dueMatch[1] : null;
                const effectiveDateStr = scheduled || due;
                if (!effectiveDateStr)
                    continue;
                const dateObj = moment(effectiveDateStr);
                if (!dateObj.isSameOrBefore(limitDate))
                    continue;
                const cleanText = normalizeTaskText(originalText);
                const displayText = normalizeTaskTextForDisplay(originalText);
                const idMatch = originalText.match(TASK_ID_REGEX$1);
                const taskId = idMatch ? idMatch[1] : undefined;
                tasks.push({
                    text: originalText,
                    cleanText: cleanText || "Untitled Task",
                    displayText: displayText || cleanText || "Untitled Task",
                    status: "todo",
                    path: file.path,
                    scheduled,
                    due,
                    effectiveDateStr,
                    taskId,
                });
            }
        }
        tasks.sort((a, b) => {
            if (a.effectiveDateStr !== b.effectiveDateStr) {
                return a.effectiveDateStr.localeCompare(b.effectiveDateStr);
            }
            return a.path.localeCompare(b.path);
        });
        return tasks;
    });
}
function groupTasksByDate(tasks) {
    const today = moment().startOf("day");
    const groups = [];
    let currentLabel = "";
    let currentItems = [];
    const pushGroup = () => {
        if (!currentLabel || currentItems.length === 0)
            return;
        groups.push({ label: currentLabel, items: currentItems });
        currentItems = [];
    };
    for (const task of tasks) {
        const dateObj = moment(task.effectiveDateStr);
        let label = "";
        if (dateObj.isBefore(today)) {
            label = "Overdue";
        }
        else if (dateObj.isSame(today, "day")) {
            label = "Today";
        }
        else if (dateObj.isSame(moment().add(1, "day"), "day")) {
            label = "Tomorrow";
        }
        else {
            label = dateObj.format("dddd, MMM D");
        }
        if (label !== currentLabel) {
            pushGroup();
            currentLabel = label;
        }
        currentItems.push(task);
    }
    pushGroup();
    return groups;
}

// Inline SVG icons for the day/night indicator. Kept hand-coded (rather than
// using setIcon from Obsidian) so the four shapes share a single stack and
// don't introduce a separate icon-stylesheet dependency.
const DAY_NIGHT_ICON_ORDER = ["sun", "sunset", "moon", "sunrise"];
const SVG_NS = "http://www.w3.org/2000/svg";
const createSvgEl = (tag) => activeDocument.createElementNS(SVG_NS, tag);
function buildDayNightIcon(icon) {
    const svg = createSvgEl("svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const addPath = (d) => {
        const p = createSvgEl("path");
        p.setAttribute("d", d);
        svg.appendChild(p);
    };
    if (icon === "sun") {
        const c = createSvgEl("circle");
        c.setAttribute("cx", "12");
        c.setAttribute("cy", "12");
        c.setAttribute("r", "4");
        svg.appendChild(c);
        addPath("M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41");
        return svg;
    }
    if (icon === "sunset") {
        addPath("M6 18h12");
        addPath("M7 18a5 5 0 0 1 10 0");
        addPath("M12 3v3");
        addPath("M5 12h2M17 12h2");
        addPath("M7 9l1.2 1.2M17 9l-1.2 1.2");
        return svg;
    }
    if (icon === "sunrise") {
        addPath("M6 18h12");
        addPath("M7 18a5 5 0 0 1 10 0");
        addPath("M12 3v3");
        addPath("M5 12h2M17 12h2");
        addPath("M4 15h2M18 15h2");
        return svg;
    }
    // moon
    addPath("M21 12.6A8.5 8.5 0 0 1 11.4 3a7 7 0 1 0 9.6 9.6Z");
    return svg;
}

/** How many volume posts fit into `durationMs` at `stepMs` apart — at least one. */
function rampSteps(durationMs, stepMs) {
    return Math.max(1, Math.round(durationMs / stepMs));
}
class GentlePomoView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.dayNightIconEls = {};
        this.settingsVisible = false;
        this.taskListVisible = false;
        this.musicSectionVisible = false; // mirrors musicSection's gp-hidden; feeds the divider rule
        this.musicIframe = null;
        this.musicListenTimeout = null;
        this.musicPlayerReady = false;
        this.musicPlayerState = YT_STATE.UNSTARTED;
        this.musicErrorNotified = false; // one Notice per iframe build
        this.musicEndedTimeout = null; // pending "music ended" Notice
        this.musicStallTimeout = null; // pending "music is buffering" Notice
        this.musicStallNotifiedAt = 0; // rate-limits stall notices (0 = never fired)
        // Resume bookkeeping. The embed reports its clock/metadata piecemeal over
        // infoDelivery, so the view keeps the running picture and hands whole
        // positions to the plugin (which owns persistence).
        this.musicCurrentVideoId = null; // seeded from the URL, corrected by videoData
        this.musicCurrentDuration = null; // null/0 ⇒ live stream: nothing to resume
        this.musicTargetPlaylistId = null; // list context of the loaded embed
        this.pendingResumeSeconds = null; // one-shot: seek here once playback starts
        this.resumeSeekLanding = null; // seek posted, waiting for the clock to catch up
        // Music volume ramps. One channel serves both the sound-cue duck and the
        // ♪/⏸/⏹ fades, so they can never post over each other. musicRampLevel is the
        // last 0–1 volume actually posted by a ramp — the start point for the next one
        // (so overlapping ramps never jump) and, when non-null, the "the player is not
        // simply sitting at the user's volume" marker.
        this.musicRampInterval = null;
        this.duckRestoreTimeout = null;
        this.musicFadeArmTimeout = null; // "playback never started" backstop
        this.musicRampLevel = null;
        // Fade phase. "armed" = ♪ pressed and the volume parked at 0, waiting for
        // playback to actually start; "in"/"out" = a fade ramp is running. A fade owns
        // the volume for its whole life, so ducking stands down while one is in flight.
        this.musicFadePhase = null;
        // ⏹ pressed: the fade-out is still playing audio, but the position has already
        // been forgotten and must not be recorded again on the way down.
        this.musicStopPending = false;
        this.timerListener = null;
        this.lastState = null;
        this.resizeObserver = null;
        this.peekTimeout = null;
        // Last countdown string rendered; used to skip the ~20Hz text/gradient writes on
        // ticks where the displayed second didn't change (avoids iPhone backdrop flicker).
        this.lastTimeText = null;
        // Last end-time string rendered; gates the ~once/minute DOM write (mirrors lastTimeText).
        this.lastEndText = null;
        // Music reconciliation guards (same write-guard family). lastMusicKey gates the
        // whole (toggle, url) reconcile to actual changes; lastMusicEmbedUrl gates iframe
        // rebuilds; lastAppliedMusicVolume gates setVolume posts.
        this.lastMusicKey = null;
        this.lastMusicEmbedUrl = null;
        this.lastAppliedMusicVolume = null;
        this.plugin = plugin;
        this.timer = plugin.timer;
    }
    getViewType() {
        return VIEW_TYPE_GENTLE_POMO;
    }
    getDisplayText() {
        return "Gentle pomodoro";
    }
    getIcon() {
        return "clock";
    }
    onOpen() {
        const container = this.containerEl;
        container.empty();
        container.addClass("gp-root");
        // Toggle .gp-compact when the panel is a short, wide leaf (e.g. iPhone landscape),
        // measured directly off the panel element. We can't use viewport media queries
        // here: Obsidian's mobile webview doesn't expose reliable @media for this leaf.
        // ResizeObserver catches the leaf resize; the window "resize" listener is a
        // belt-and-suspenders catch for rotation. See updateCompactClass + styles.css.
        this.resizeObserver = new ResizeObserver(() => this.updateCompactClass());
        this.resizeObserver.observe(container);
        this.registerDomEvent(window, "resize", () => this.updateCompactClass());
        // --- Timer Visual Area ---
        const visual = container.createDiv("gp-timer-visual");
        this.timerVisual = visual;
        // Tap-to-peek: touch devices have no hover, so tapping the shape reveals
        // the running countdown via the .gp-peek class — the touch equivalent of
        // the desktop hover reveal (see styles.css). Since there's no hover-out to
        // re-hide it, auto-hide after a short peek; each tap restarts the countdown.
        // Harmless on desktop, where the :hover rule drives the reveal instead.
        this.registerDomEvent(visual, "click", () => {
            visual.addClass("gp-peek");
            if (this.peekTimeout !== null)
                window.clearTimeout(this.peekTimeout);
            this.peekTimeout = window.setTimeout(() => {
                visual.removeClass("gp-peek");
                this.peekTimeout = null;
            }, PEEK_REVEAL_MS);
        });
        // Create Shape
        this.timerShape = visual.createDiv("gp-timer-shape");
        // Create Layers in Order: Day -> Dusk -> Night
        this.timerShape.createDiv("gp-layer-day");
        this.timerShape.createDiv("gp-layer-dusk");
        this.timerShape.createDiv("gp-layer-night");
        // Frosted-glass theme layers (CSS-toggled per theme; built once here).
        const orbs = this.timerShape.createDiv("gp-glass-orbs");
        orbs.createDiv("gp-orb gp-orb-1");
        orbs.createDiv("gp-orb gp-orb-2");
        orbs.createDiv("gp-orb gp-orb-3");
        this.timerShape.createDiv("gp-glass-pane");
        this.timerShape.createDiv("gp-glass-highlight");
        const content = visual.createDiv("gp-timer-content");
        this.dayNightIndicator = content.createDiv("gp-daynight-indicator");
        this.dayNightIndicator.setAttribute("aria-hidden", "true");
        const badge = this.dayNightIndicator.createDiv("gp-daynight-badge");
        const iconStack = badge.createDiv("gp-daynight-icon-stack");
        DAY_NIGHT_ICON_ORDER.forEach((key) => {
            const iconEl = iconStack.createSpan({ cls: "gp-daynight-icon" });
            iconEl.appendChild(buildDayNightIcon(key));
            this.dayNightIconEls[key] = iconEl;
        });
        this.timeLabel = content.createDiv("gp-timer-time");
        this.totalTimeLabel = content.createDiv("gp-total-time");
        this.modeLabel = content.createDiv("gp-mode-label");
        this.endTimeLabel = content.createDiv("gp-end-time");
        // --- Controls ---
        const controls = container.createDiv("gp-controls");
        // ROW 1: Start, Pause, Stop, Reset, Skip
        const row1 = controls.createDiv("gp-controls-row");
        const startBtn = row1.createEl("button", { cls: "gp-btn gp-icon-btn gp-btn-primary" });
        obsidian.setIcon(startBtn, "play");
        startBtn.setAttribute("aria-label", "Start");
        this.registerDomEvent(startBtn, "click", (evt) => {
            evt.preventDefault();
            this.timer.start();
        });
        const pauseBtn = row1.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(pauseBtn, "pause");
        pauseBtn.setAttribute("aria-label", "Pause");
        this.registerDomEvent(pauseBtn, "click", (evt) => {
            evt.preventDefault();
            this.timer.pause();
        });
        this.secondaryControlsWrapper = row1.createDiv("gp-animated-wrapper gp-secondary-controls");
        const stopBtn = this.secondaryControlsWrapper.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(stopBtn, "square");
        stopBtn.setAttribute("aria-label", "Finish & next");
        this.registerDomEvent(stopBtn, "click", (evt) => {
            evt.preventDefault();
            void this.timer.finish();
        });
        const resetBtn = this.secondaryControlsWrapper.createEl("button", {
            cls: "gp-btn gp-icon-btn",
        });
        obsidian.setIcon(resetBtn, "rotate-ccw");
        resetBtn.setAttribute("aria-label", "Reset session");
        this.registerDomEvent(resetBtn, "click", (evt) => {
            evt.preventDefault();
            this.timer.reset();
        });
        const skipBtn = row1.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(skipBtn, "skip-forward");
        skipBtn.setAttribute("aria-label", "Skip to next");
        this.registerDomEvent(skipBtn, "click", (evt) => {
            evt.preventDefault();
            void this.timer.skip();
        });
        // ROW 2: -5m, +5m, Settings
        const row2 = controls.createDiv("gp-controls-row");
        this.adjustWrapper = row2.createDiv("gp-animated-wrapper gp-adjust-wrapper");
        const minusBtn = this.adjustWrapper.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(minusBtn, "minus");
        this.registerDomEvent(minusBtn, "click", (evt) => {
            evt.preventDefault();
            if (this.timer.getState().remainingMs > 5 * ONE_MINUTE_MS) {
                this.timer.addMinutes(-5);
            }
        });
        const plusBtn = this.adjustWrapper.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(plusBtn, "plus");
        this.registerDomEvent(plusBtn, "click", (evt) => {
            evt.preventDefault();
            this.timer.addMinutes(5);
        });
        const settingsBtn = row2.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(settingsBtn, "settings");
        this.registerDomEvent(settingsBtn, "click", (evt) => {
            evt.preventDefault();
            this.settingsVisible = !this.settingsVisible;
            this.settingsPanel.toggleClass("gp-visible", this.settingsVisible);
            settingsBtn.setAttribute("aria-expanded", this.settingsVisible ? "true" : "false");
            if (this.settingsVisible) {
                this.renderSettingsPanel();
                // Give the open transition a moment to start, then scroll the
                // panel into view so the user sees it without manual scrolling.
                window.setTimeout(() => {
                    this.settingsPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
                }, 50);
            }
        });
        // --- Settings Panel ---
        this.settingsPanel = controls.createDiv("gp-settings-panel");
        this.renderSettingsPanel();
        // ROW 3: Task Selector
        const row3 = controls.createDiv("gp-controls-row");
        this.taskSelectorRow = row3;
        this.taskBtn = row3.createEl("button", { cls: "gp-btn gp-btn-full" });
        const btnLabel = this.taskBtn.createDiv("gp-task-btn-label");
        btnLabel.setText("Current task");
        const btnText = this.taskBtn.createDiv("gp-task-btn-text");
        btnText.setText("Select a task...");
        this.registerDomEvent(this.taskBtn, "click", () => {
            this.taskListVisible = !this.taskListVisible;
            if (this.taskListVisible) {
                this.taskListContainer.addClass("gp-visible");
                void this.loadTasks();
            }
            else {
                this.taskListContainer.removeClass("gp-visible");
            }
        });
        // --- Task List Container ---
        this.taskListContainer = controls.createDiv("gp-task-list");
        // --- Music (audio-only lofi playback) ---
        // Hairline between the task selector and the music row. Reconciled in
        // applySettings — visible only when both neighbors are visible, so it
        // never dangles under a hidden selector or above a hidden music row.
        this.musicDivider = controls.createDiv("gp-music-divider");
        // The ♪ row is the only playback UI — the YouTube iframe below is a
        // visually-hidden audio engine (see .gp-music-player in styles.css). The
        // iframe itself is (re)built in applySettings(), which reconciles the
        // showMusicPlayer/musicUrl settings against the DOM.
        this.musicSection = controls.createDiv("gp-music-section");
        const musicRow = this.musicSection.createDiv("gp-controls-row");
        // Decorative glyph so the row reads as the music row, not more timer buttons.
        const musicGlyph = musicRow.createSpan("gp-music-row-icon");
        obsidian.setIcon(musicGlyph, "music");
        musicGlyph.setAttribute("aria-hidden", "true");
        this.musicPlayBtn = musicRow.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(this.musicPlayBtn, "play");
        this.musicPlayBtn.setAttribute("aria-label", "Play music");
        this.registerDomEvent(this.musicPlayBtn, "click", (evt) => {
            evt.preventDefault();
            // Pre-handshake commands are silently dropped by the embed — without
            // this, playing while offline (or mid-boot) is just a dead button.
            if (!this.musicPlayerReady) {
                new obsidian.Notice("Gentle pomodoro: the music player hasn't loaded yet — wait a moment, or check your connection if you're offline.");
                return;
            }
            // Park the volume at silence and arm the fade — it starts for real when
            // playback does, so it isn't spent on the buffering gap before any audio.
            // (Or, if this press landed inside a fade-out, cancel that and ease back
            // up from where it got to — the player never stopped.)
            this.armMusicFadeIn();
            this.postToMusicPlayer(buildPlayerCommand("playVideo"));
        });
        this.musicPauseBtn = musicRow.createEl("button", { cls: "gp-btn gp-icon-btn gp-hidden" });
        obsidian.setIcon(this.musicPauseBtn, "pause");
        this.musicPauseBtn.setAttribute("aria-label", "Pause music");
        this.registerDomEvent(this.musicPauseBtn, "click", (evt) => {
            evt.preventDefault();
            // Fade first, pause on landing: pausing up front would cut the audio dead
            // and leave the fade nothing to fade.
            this.fadeMusicOut(() => this.postToMusicPlayer(buildPlayerCommand("pauseVideo")));
        });
        const musicStopBtn = musicRow.createEl("button", { cls: "gp-btn gp-icon-btn" });
        obsidian.setIcon(musicStopBtn, "square");
        musicStopBtn.setAttribute("aria-label", "Stop music");
        this.registerDomEvent(musicStopBtn, "click", (evt) => {
            evt.preventDefault();
            // Stop means "start from the top next time" — pause is what remembers.
            // Dropping the pending seek is what makes that true within this session
            // too; the embed URL itself never carried the offset.
            //
            // All of it lands *with* the stopVideo, not on the click: ♪ pressed
            // inside the fade-out cancels the stop, and a half-applied stop would
            // outlive it (a nulled musicCurrentDuration alone kills position
            // recording for the rest of the track — isResumablePosition reads a null
            // duration as "live stream"). musicStopPending is the one thing set now,
            // because audio keeps running through the fade and those last reported
            // seconds must not bank a position the stop is about to drop.
            this.musicStopPending = true;
            this.fadeMusicOut(() => {
                this.postToMusicPlayer(buildPlayerCommand("stopVideo"));
                this.plugin.clearMusicPosition();
                this.pendingResumeSeconds = null;
                // A seek posted but never landed would otherwise keep blocking
                // trackMusicPosition against an offset the restarted track has to climb
                // all the way back to before recording anything.
                this.resumeSeekLanding = null;
                this.musicCurrentDuration = null;
                // A stop that landed on an already-halted player is settled right here:
                // no straggler clock can pass trackMusicPosition's audibility gate, and
                // there may be no further state transition to settle it later. When the
                // player was still running, the flag must survive until the embed
                // reports the halt (handleMusicState clears it) — the embed keeps
                // reporting PLAYING clocks for a beat after stopVideo, and those must
                // not re-bank the position just cleared.
                if (!this.isAudibleState(this.musicPlayerState))
                    this.musicStopPending = false;
            });
        });
        this.musicPlayerContainer = this.musicSection.createDiv("gp-music-player");
        // The embed talks back over the shared window message bus. Source and
        // origin are checked before parsing — everything else on the bus is noise.
        this.registerDomEvent(window, "message", (evt) => {
            if (!this.musicIframe || evt.source !== this.musicIframe.contentWindow)
                return;
            if (!YT_ALLOWED_MESSAGE_ORIGINS.includes(evt.origin))
                return;
            const msg = parsePlayerMessage(evt.data);
            if (!msg)
                return;
            if (msg.type === "ready") {
                this.musicPlayerReady = true;
                // Apply the saved volume as soon as the player can take commands.
                this.postMusicVolume();
            }
            else if (msg.type === "error") {
                this.notifyMusicError(msg.code);
            }
            else if (msg.type === "state") {
                this.handleMusicState(msg.state);
            }
            else {
                // infoDelivery: merge whatever this message carried, position before
                // state so a transition into PAUSED flushes the freshest clock value.
                if (msg.videoId !== null)
                    this.musicCurrentVideoId = msg.videoId;
                if (msg.duration !== null)
                    this.musicCurrentDuration = msg.duration;
                if (msg.currentTime !== null)
                    this.trackMusicPosition(msg.currentTime);
                if (msg.state !== null)
                    this.handleMusicState(msg.state);
            }
        });
        // Daily-goal progress. Hidden on desktop via CSS (the status bar carries it
        // there); revealed on mobile, where Obsidian hides the status bar. Populated by
        // the plugin via refreshViewGoalProgress() — once now (so it shows immediately,
        // even idle) and again on every timer tick (in timerListener below). Driving it
        // from the view's own subscription rather than the status-bar update path is what
        // makes it appear on mobile, where the status bar (and its update loop) is absent.
        this.goalProgressEl = container.createDiv("gp-goal-progress");
        this.plugin.refreshViewGoalProgress(this);
        // (Control-button glyph sizing — including the iPad min-width floor — lives in
        // styles.css; see the `.gp-icon-btn svg.svg-icon` rule in the Mobile & touch section.)
        // --- State Updates ---
        this.timerListener = (state) => {
            this.lastState = state;
            this.applySettings();
            this.plugin.refreshViewGoalProgress(this, state);
            if (state.isRunning) {
                startBtn.addClass("gp-hidden");
                pauseBtn.removeClass("gp-hidden");
                this.secondaryControlsWrapper.removeClass("gp-hidden-animated");
                this.adjustWrapper.removeClass("gp-hidden-animated");
            }
            else {
                startBtn.removeClass("gp-hidden");
                pauseBtn.addClass("gp-hidden");
                if (state.remainingMs !== state.totalMs) {
                    this.secondaryControlsWrapper.removeClass("gp-hidden-animated");
                    this.adjustWrapper.removeClass("gp-hidden-animated");
                }
                else {
                    this.secondaryControlsWrapper.addClass("gp-hidden-animated");
                    this.adjustWrapper.addClass("gp-hidden-animated");
                }
            }
            if (state.remainingMs <= 5 * ONE_MINUTE_MS) {
                minusBtn.setAttribute("disabled", "true");
                minusBtn.addClass("gp-btn-disabled");
            }
            else {
                minusBtn.removeAttribute("disabled");
                minusBtn.removeClass("gp-btn-disabled");
            }
            const isOvertime = state.remainingMs < 0;
            visual.toggleClass("gp-state-overtime", isOvertime);
            visual.toggleClass("gp-mode-focus", state.mode === "focus");
            visual.toggleClass("gp-mode-break", state.mode === "break");
            const absMs = Math.abs(state.remainingMs);
            const totalSec = Math.ceil(absMs / 1000);
            const m = Math.floor(totalSec / 60);
            const s = totalSec % 60;
            let timeText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
            if (isOvertime) {
                timeText = "+" + timeText;
                this.timeLabel.addClass("gp-overtime");
            }
            else {
                this.timeLabel.removeClass("gp-overtime");
            }
            this.modeLabel.setText(state.mode === "focus" ? "Focus" : "Rest");
            visual.toggleClass("gp-state-running", state.isRunning);
            const textEl = this.taskBtn.querySelector(".gp-task-btn-text");
            if (textEl) {
                if (state.taskName === NO_TASK_LABEL) {
                    textEl.setText("Select a task...");
                }
                else {
                    textEl.setText(state.taskName);
                }
            }
            // The timer ticks every 50ms (see TimerEngine), but the displayed second — and
            // the gradient driven off it — only changes ~1×/sec. Writing the countdown text
            // and the gradient CSS variables on every tick makes the frosted-glass
            // backdrop-filter re-blur ~20×/sec, which flickers on iPhone. Gate those writes
            // on the second actually changing; the 0.8s CSS transitions bridge the steps.
            if (timeText !== this.lastTimeText) {
                this.lastTimeText = timeText;
                this.timeLabel.setText(timeText);
                if (isOvertime) {
                    const actualTotalMs = state.totalMs + absMs;
                    const tSec = Math.floor(actualTotalMs / 1000);
                    const tM = Math.floor(tSec / 60);
                    const tS = tSec % 60;
                    this.totalTimeLabel.setText(`Total: ${tM}:${tS.toString().padStart(2, "0")}`);
                }
                else {
                    this.totalTimeLabel.setText("");
                }
                // --- Gradient Transition Logic ---
                let progress = 0;
                if (state.totalMs > 0) {
                    progress = 1 - state.remainingMs / state.totalMs;
                }
                progress = Math.max(0, Math.min(1, progress));
                let skyPhase = 0;
                if (state.mode === "focus") {
                    skyPhase = progress;
                }
                else {
                    skyPhase = 1 - progress;
                }
                let duskOpacity = 0;
                let nightOpacity = 0;
                if (skyPhase < 0.5) {
                    duskOpacity = skyPhase * 2;
                    nightOpacity = 0;
                }
                else {
                    duskOpacity = 1;
                    nightOpacity = (skyPhase - 0.5) * 2;
                }
                visual.style.setProperty("--gp-dusk-opacity", duskOpacity.toString());
                visual.style.setProperty("--gp-night-opacity", nightOpacity.toString());
                // Consumed by frosted-glass orb color-mix() in styles.css. Uses skyPhase
                // (not raw progress) so orbs warm→cool on focus and cool→warm on break,
                // matching the classic theme's narrative arc.
                visual.style.setProperty("--gp-progress", skyPhase.toString());
            }
        };
        this.plugin.timer.onChange(this.timerListener);
        return Promise.resolve();
    }
    onClose() {
        var _a;
        if (this.timerListener) {
            this.plugin.timer.offChange(this.timerListener);
            this.timerListener = null;
        }
        (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.resizeObserver = null;
        if (this.peekTimeout !== null) {
            window.clearTimeout(this.peekTimeout);
            this.peekTimeout = null;
        }
        // The iframe would die with the view DOM anyway, but explicit teardown
        // clears the pending handshake timeout and nulls the refs.
        this.destroyMusicIframe();
        return Promise.resolve();
    }
    /**
     * Add .gp-compact to the panel when it's a short, wide leaf (e.g. iPhone
     * landscape), so styles.css can shrink + un-pin the timer. Detection keys off the
     * panel's measured *aspect ratio* (wider than tall) rather than an absolute height
     * threshold — Obsidian's mobile webview reports unreliable viewport state, and an
     * earlier `< 480px` height guess never matched. `h < 600` still excludes iPad
     * landscape (~760px+); `Platform.isMobile` keeps desktop out. Measured off the real
     * panel element, not a media query.
     */
    updateCompactClass() {
        const w = this.containerEl.clientWidth;
        const h = this.containerEl.clientHeight;
        const compact = obsidian.Platform.isMobile && h < w && h < 600;
        this.containerEl.toggleClass("gp-compact", compact);
    }
    /**
     * Update the in-view daily-goal progress line. Called from main.ts alongside
     * the status-bar update so mobile (no status bar) still sees goal progress.
     * The element is hidden on desktop via CSS, so this is a cheap no-op there.
     */
    setGoalProgress(text, met) {
        if (!this.goalProgressEl)
            return;
        this.goalProgressEl.setText(text);
        this.goalProgressEl.toggleClass("gp-goal-met", met);
    }
    applySettings() {
        var _a, _b, _c, _d, _e, _f;
        const theme = this.plugin.settings.theme;
        this.containerEl.toggleClass("gp-theme-classic", theme === "classic");
        this.containerEl.toggleClass("gp-theme-frosted-glass", theme === "frosted-glass");
        const state = (_a = this.lastState) !== null && _a !== void 0 ? _a : this.timer.getState();
        // Task-selector visibility. Idempotent, so safe to run on every tick. The
        // unlink-on-hide side effect lives in the settings toggle's onChange (calling
        // setTask here would fire every tick); on load no task is ever pre-linked.
        const showSelector = this.plugin.settings.showTaskSelector;
        (_b = this.taskSelectorRow) === null || _b === void 0 ? void 0 : _b.toggleClass("gp-hidden", !showSelector);
        (_c = this.taskListContainer) === null || _c === void 0 ? void 0 : _c.toggleClass("gp-hidden", !showSelector);
        if (!showSelector && this.taskListVisible) {
            this.taskListVisible = false;
            this.taskListContainer.removeClass("gp-visible");
        }
        // Music player reconciliation. Runs here so the per-tick call and the settings
        // tab's applySettingsToOpenViews() converge on the same DOM. The lastMusicKey
        // string guard keeps the ~20Hz hot path to one concat + compare — the URL is
        // only parsed when the (toggle, loop, url) triple actually changes. Removing
        // the iframe is what stops playback, which implements "toggle off = hide + stop".
        // Loop is baked into the embed URL, so flipping it rebuilds the iframe too.
        const musicKey = `${this.plugin.settings.showMusicPlayer ? "1" : "0"}|${this.plugin.settings.musicLoop ? "1" : "0"}|${this.plugin.settings.musicUrl}`;
        if (musicKey !== this.lastMusicKey) {
            this.lastMusicKey = musicKey;
            const target = this.plugin.settings.showMusicPlayer
                ? parseYouTubeUrl(this.plugin.settings.musicUrl)
                : null;
            // Work out the remembered position here, at build time — deliberately NOT
            // part of musicKey, since keying on a value that moves every second would
            // rebuild the iframe ~20×/sec. The offset is carried as a pending seek,
            // not baked into the URL, so the embed stays exactly what 0.5.2 built.
            // While a ⏹ is pending, plan as if the store were already empty: its
            // clearMusicPosition rides in the fade landing, and a rebuild inside that
            // window (flipping Loop, say) would otherwise snapshot the position the
            // stop is in the middle of forgetting and seed the new iframe with it.
            const plan = target
                ? planResume(target, this.musicStopPending ? null : this.plugin.musicResumeState())
                : null;
            const embedUrl = plan ? buildEmbedUrl(plan.target, this.plugin.settings.musicLoop) : null;
            this.musicSectionVisible = embedUrl !== null;
            (_d = this.musicSection) === null || _d === void 0 ? void 0 : _d.toggleClass("gp-hidden", !this.musicSectionVisible);
            if (embedUrl !== this.lastMusicEmbedUrl) {
                this.lastMusicEmbedUrl = embedUrl;
                this.destroyMusicIframe();
                if (embedUrl !== null && plan !== null)
                    this.buildMusicIframe(embedUrl, plan);
            }
        }
        // The task-selector/music divider needs both neighbors visible. Outside the
        // musicKey guard because showTaskSelector can change independently of it.
        (_e = this.musicDivider) === null || _e === void 0 ? void 0 : _e.toggleClass("gp-hidden", !showSelector || !this.musicSectionVisible);
        // Volume convergence (settings changed from another view or a reload while
        // the player was still booting). No-op per tick once applied.
        if (this.musicPlayerReady && this.plugin.settings.musicVolume !== this.lastAppliedMusicVolume) {
            this.postMusicVolume();
        }
        // Estimated end time. Shown only while running and before overtime — a static
        // "you'll finish at 15:30", the calm counterpart to the hidden countdown.
        // Driven from here (not just the tick listener, which calls applySettings) so
        // toggling the setting updates open views at once; the lastEndText guard keeps
        // the DOM write to ~once/minute. See formatEndTime for the day-rollover suffix.
        if (this.endTimeLabel) {
            const showEnd = this.plugin.settings.showEndTime && state.isRunning && state.remainingMs > 0;
            this.endTimeLabel.toggleClass("gp-visible", showEnd);
            if (showEnd) {
                const endText = this.formatEndTime(Date.now() + state.remainingMs);
                if (endText !== this.lastEndText) {
                    this.lastEndText = endText;
                    this.endTimeLabel.setText(endText);
                }
            }
            else {
                this.lastEndText = null;
            }
        }
        if (!this.dayNightIndicator)
            return;
        const enabled = this.plugin.settings.showDayNightIndicator;
        this.dayNightIndicator.toggleClass("gp-hidden", !enabled);
        if (!enabled)
            return;
        const icon = this.getDayNightIcon(state);
        for (const key of DAY_NIGHT_ICON_ORDER) {
            (_f = this.dayNightIconEls[key]) === null || _f === void 0 ? void 0 : _f.toggleClass("is-active", key === icon);
        }
    }
    /**
     * Create the hidden YouTube iframe and start the postMessage handshake:
     * after the iframe's load event, wait a beat (the embed isn't ready the
     * instant it loads), then announce {"event":"listening"} so it starts
     * streaming onReady/onStateChange/infoDelivery/onError back to us.
     */
    buildMusicIframe(embedUrl, plan) {
        // Seed the resume bookkeeping from the target. videoId matters for a plain
        // video, where the embed's videoData may never tell us anything we don't
        // already know; inside a playlist the stream corrects it as items advance.
        this.musicCurrentVideoId = plan.target.videoId;
        this.musicTargetPlaylistId = plan.target.playlistId;
        this.musicCurrentDuration = null;
        this.pendingResumeSeconds = plan.seekSeconds;
        this.resumeSeekLanding = null;
        const iframe = this.musicPlayerContainer.createEl("iframe", {
            attr: {
                src: embedUrl,
                allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
                referrerpolicy: "strict-origin-when-cross-origin", // YouTube needs a Referer or it throws error 153
                allowfullscreen: "",
                title: "Lofi music player",
            },
        });
        this.musicIframe = iframe;
        this.registerDomEvent(iframe, "load", () => {
            if (this.musicListenTimeout !== null)
                window.clearTimeout(this.musicListenTimeout);
            this.musicListenTimeout = window.setTimeout(() => {
                this.musicListenTimeout = null;
                this.postToMusicPlayer(buildListeningMessage());
            }, MUSIC_LISTENING_DELAY_MS);
        });
    }
    /**
     * Tear the iframe down — removal from the DOM is what stops playback.
     * Also resets the handshake/volume state so a rebuilt iframe starts fresh.
     */
    destroyMusicIframe() {
        var _a;
        // Teardown is a boundary: closing the panel, moving the leaf, or changing
        // the URL all end playback. The pending position is keyed by the video it
        // came from, so saving the *outgoing* one here is correct even mid-swap —
        // unless ⏹ was pressed and its fade never landed, in which case the stop is
        // honoured instead. Banking a position the user just asked to forget would
        // be the wrong answer to the last button they pressed.
        if (this.musicStopPending)
            this.plugin.clearMusicPosition();
        else
            this.plugin.flushMusicPosition();
        this.pendingResumeSeconds = null;
        this.resumeSeekLanding = null;
        this.musicCurrentVideoId = null;
        this.musicCurrentDuration = null;
        this.musicTargetPlaylistId = null;
        this.musicStopPending = false;
        // Drops the ramp timers along with any pauseVideo/stopVideo still waiting on
        // one — the iframe is going away, and removing it is what stops playback.
        this.cancelMusicRamps();
        if (this.musicListenTimeout !== null) {
            window.clearTimeout(this.musicListenTimeout);
            this.musicListenTimeout = null;
        }
        if (this.musicEndedTimeout !== null) {
            window.clearTimeout(this.musicEndedTimeout);
            this.musicEndedTimeout = null;
        }
        if (this.musicStallTimeout !== null) {
            window.clearTimeout(this.musicStallTimeout);
            this.musicStallTimeout = null;
        }
        (_a = this.musicIframe) === null || _a === void 0 ? void 0 : _a.remove();
        this.musicIframe = null;
        this.musicPlayerReady = false;
        this.musicErrorNotified = false;
        this.lastAppliedMusicVolume = null;
        this.updateMusicButtons(YT_STATE.UNSTARTED);
    }
    postToMusicPlayer(payload) {
        var _a, _b;
        (_b = (_a = this.musicIframe) === null || _a === void 0 ? void 0 : _a.contentWindow) === null || _b === void 0 ? void 0 : _b.postMessage(payload, YT_EMBED_ORIGIN);
    }
    postMusicVolume() {
        // A fade owns the volume from the ♪/⏸/⏹ press until it lands — jumping the
        // player to full volume mid-fade is exactly the jolt the fade exists to
        // remove. The fade-in re-reads the setting when it lands, so a volume
        // change made mid-fade still arrives. Deliberately does NOT stamp
        // lastAppliedMusicVolume: leaving it stale keeps applySettings' convergence
        // check firing, so if a fade ever ends without applying the volume itself,
        // the next tick heals it rather than the control going quietly dead.
        //
        // A running fade-in is re-aimed rather than dropped: its ramp was built to
        // a target snapshotted at the start, so leaving it alone would climb to the
        // old volume and only then jump to the new one. 0.5.0's promise is that
        // changing the music volume always wins immediately.
        if (this.musicFadePhase === "in") {
            // Stamped here precisely because the ramp is what applies it now: leaving
            // it stale would have the ~20Hz convergence check rebuild the ramp on
            // every tick, restarting it faster than a single step could ever fire.
            this.lastAppliedMusicVolume = this.plugin.settings.musicVolume;
            this.beginMusicFadeIn();
            return;
        }
        if (this.musicFadePhase !== null)
            return;
        // An explicit volume set (segmented control, reset, cross-view reconcile)
        // always wins over an in-flight duck.
        this.cancelMusicRamps();
        this.postToMusicPlayer(buildPlayerCommand("setVolume", [musicVolumeTo100(this.plugin.settings.musicVolume)]));
        this.lastAppliedMusicVolume = this.plugin.settings.musicVolume;
    }
    /**
     * ♪ pressed: park the player at silence and arm the fade-in. The ramp itself
     * waits for the first PLAYING state (see handleMusicState) — playVideo is
     * followed by a buffering gap with no audio in it, and a fade spent on
     * silence is a fade nobody hears.
     *
     * This also cancels whatever the previous press left running. A fade-out
     * still on its way down is abandoned here, which is what makes ⏸ → ♪ during
     * a fade simply carry on playing: the pending pauseVideo/stopVideo lives in
     * the ramp's completion callback, so dropping the ramp drops the command too.
     */
    armMusicFadeIn() {
        // Read before the clear: a player still running here means the press landed
        // inside a fade-out that had not yet paused or stopped it.
        const stillRunning = this.isAudibleState(this.musicPlayerState);
        this.clearMusicRampTimers();
        this.musicStopPending = false;
        if (stillRunning) {
            // The player never actually stopped, so playVideo changes nothing and no
            // state transition need ever arrive — an armed fade could wait forever
            // with the volume parked at 0. Ease straight back up from wherever the
            // abandoned fade-out got to instead; that is also the smoother sound. If
            // it happens to be mid-rebuffer, the ramp's own hold covers the silence.
            this.setMusicButtonsPlaying(true);
            this.beginMusicFadeIn();
            return;
        }
        this.musicFadePhase = "armed";
        this.musicRampLevel = 0;
        this.postToMusicPlayer(buildPlayerCommand("setVolume", [0]));
        this.scheduleMusicFadeArmBackstop();
        // A cancelled fade-out already flipped the buttons to "paused" — put back
        // whatever the player is really doing.
        this.setMusicButtonsPlaying(this.isAudibleState(this.musicPlayerState));
    }
    /**
     * Backstop for the "armed" phase: if playback never starts, stand the fade
     * down rather than leave the player silent with postMusicVolume locked out.
     * A player that is merely buffering slowly hands over to the ramp instead,
     * which holds itself until audio starts — cancelling there would make a slow
     * connection snap in at full volume once it finally plays.
     */
    scheduleMusicFadeArmBackstop() {
        if (this.musicFadeArmTimeout !== null)
            window.clearTimeout(this.musicFadeArmTimeout);
        this.musicFadeArmTimeout = window.setTimeout(() => {
            this.musicFadeArmTimeout = null;
            if (this.musicFadePhase !== "armed")
                return;
            if (this.isAudibleState(this.musicPlayerState)) {
                this.beginMusicFadeIn();
                return;
            }
            this.musicFadePhase = null;
            this.postMusicVolume();
        }, MUSIC_FADE_ARM_TIMEOUT_MS);
    }
    /** Run the armed fade-in, now that audio is actually flowing. */
    beginMusicFadeIn() {
        var _a;
        const from = (_a = this.musicRampLevel) !== null && _a !== void 0 ? _a : 0;
        this.clearMusicRampTimers(); // drops the arm backstop; the fade is under way
        this.musicFadePhase = "in";
        this.runMusicRamp(buildFadeRamp(from, this.plugin.settings.musicVolume, rampSteps(MUSIC_FADE_IN_MS, MUSIC_FADE_STEP_MS)), MUSIC_FADE_STEP_MS, () => {
            this.musicFadePhase = null;
            // Exact landing on the volume as it stands *now* (the setting may have
            // changed mid-fade) plus the lastAppliedMusicVolume bookkeeping.
            this.postMusicVolume();
        }, 
        // Only spend the fade on audible time. A resumed track rebuffers right
        // here — the seekTo goes out on the first audible state, usually the
        // BUFFERING just before this one — and without the hold the whole ramp
        // would run through that silence and the music would arrive at full
        // volume, no fade heard. Bounded, so a player that never comes back
        // can't strand the ramp half-way up.
        () => this.musicPlayerState !== YT_STATE.PLAYING);
    }
    /**
     * ⏸/⏹ pressed: ease the volume down to silence, then run `onLanding` — the
     * pauseVideo or stopVideo that actually halts playback. Posting that command
     * first would cut the audio dead and leave the fade nothing to fade.
     *
     * Skips straight to the command when there is nothing to fade: the player
     * isn't ready, isn't running, or is already silent because ♪ was pressed and
     * playback never started. ⏹ on an idle player therefore still forgets the
     * position instantly. The player is deliberately left at volume 0 afterwards
     * — it's paused, so that is inaudible, and ♪ re-parks it at 0 regardless.
     */
    fadeMusicOut(onLanding) {
        var _a;
        const from = (_a = this.musicRampLevel) !== null && _a !== void 0 ? _a : this.plugin.settings.musicVolume;
        this.clearMusicRampTimers();
        // Swap the buttons now rather than a fade-length later, so the press never
        // looks ignored. The only thing that un-does the pending command is a ♪
        // press, and that puts the buttons back itself.
        this.setMusicButtonsPlaying(false);
        if (!this.musicPlayerReady || !this.isAudibleState(this.musicPlayerState) || from <= 0) {
            this.musicFadePhase = null;
            onLanding();
            return;
        }
        this.musicFadePhase = "out";
        this.runMusicRamp(buildFadeRamp(from, 0, rampSteps(MUSIC_FADE_OUT_MS, MUSIC_FADE_STEP_MS)), MUSIC_FADE_STEP_MS, () => {
            this.musicFadePhase = null;
            onLanding();
        });
    }
    /**
     * Dip the music under a sound cue: a quick stepped ramp to MUSIC_DUCK_FACTOR
     * × the user's volume, hold for the cue's duration, then a slower ease back
     * up. (A ramp *down* in the ordinary case — but see below: catching a fade-in
     * part-way means moving up to the ducked level rather than down to it.)
     * Called (via the plugin) from TimerEngine.playSound with
     * the decoded clip's length. A cue landing mid-duck restarts the hold from the
     * current level — extend, never double-dip. No-op unless the player is ready
     * and actually playing (pre-handshake commands are dropped by the embed anyway).
     *
     * A ♪ fade-in does NOT block the duck — that would leave a cue playing over
     * music rising to full volume, which is exactly what ducking exists to
     * prevent, and "press ♪, then press Start" puts the war drum right in that
     * window. The duck simply takes the volume over: it ramps from wherever the
     * fade had reached and its restore ramp finishes the job of bringing the
     * music up. Clearing the phase is what keeps the abandoned fade from
     * stranding it (its landing callback dies with the replaced ramp). A fade-OUT
     * still wins: the player is about to pause, so there is nothing to duck.
     */
    duckMusic(cueDurationSec) {
        var _a;
        const playing = this.isAudibleState(this.musicPlayerState);
        if (!this.musicPlayerReady || !playing || this.musicFadePhase === "out")
            return;
        const base = this.plugin.settings.musicVolume;
        const target = base * MUSIC_DUCK_FACTOR;
        const from = (_a = this.musicRampLevel) !== null && _a !== void 0 ? _a : base;
        this.clearMusicRampTimers();
        this.musicFadePhase = null;
        // The duck is aimed at the setting as it stands, so record that. A fade the
        // duck just took over may have left the stamp stale (its skip path in
        // postMusicVolume deliberately doesn't stamp), and a stale stamp here would
        // have the ~20Hz convergence check cancel this duck on the very next tick —
        // full volume under the cue, the exact thing ducking exists to prevent.
        this.lastAppliedMusicVolume = base;
        this.runMusicRamp(buildVolumeRamp(from, target, rampSteps(MUSIC_DUCK_DOWN_MS, MUSIC_DUCK_STEP_MS)), MUSIC_DUCK_STEP_MS);
        // The down-ramp runs under the cue's attack; restore starts when the clip ends.
        const holdMs = Math.max(cueDurationSec * 1000, MUSIC_DUCK_DOWN_MS);
        this.duckRestoreTimeout = window.setTimeout(() => {
            this.duckRestoreTimeout = null;
            this.restoreDuckedMusic();
        }, holdMs);
    }
    /** Ease the music back to the user's volume (re-read at restore time) and end the duck. */
    restoreDuckedMusic() {
        var _a;
        const userVolume = this.plugin.settings.musicVolume;
        const from = (_a = this.musicRampLevel) !== null && _a !== void 0 ? _a : userVolume * MUSIC_DUCK_FACTOR;
        this.runMusicRamp(buildVolumeRamp(from, userVolume, rampSteps(MUSIC_DUCK_UP_MS, MUSIC_DUCK_STEP_MS)), MUSIC_DUCK_STEP_MS, () => {
            // Exact landing + lastAppliedMusicVolume bookkeeping (the cancel inside
            // clears musicRampLevel, ending the duck).
            this.postMusicVolume();
        });
    }
    /**
     * Post a stepped volume ramp — one setVolume per `stepMs`, or none at all on
     * a tick `holdWhile` holds — and run `onDone` on the last step. Replaces any
     * running ramp, which is also how a pending pauseVideo/stopVideo gets
     * cancelled: it lives in that callback and a replaced ramp never reaches it.
     */
    runMusicRamp(levels, stepMs, onDone, holdWhile) {
        if (this.musicRampInterval !== null)
            window.clearInterval(this.musicRampInterval);
        let i = 0;
        let held = 0;
        const maxHeld = Math.floor(MUSIC_FADE_HOLD_MAX_MS / stepMs);
        this.musicRampInterval = window.setInterval(() => {
            // A held tick posts nothing and advances nothing — the ramp simply waits
            // for audio to come back, up to the bound.
            if ((holdWhile === null || holdWhile === void 0 ? void 0 : holdWhile()) === true && held < maxHeld) {
                held++;
                return;
            }
            const level = levels[i++];
            this.musicRampLevel = level;
            this.postToMusicPlayer(buildPlayerCommand("setVolume", [musicVolumeTo100(level)]));
            if (i >= levels.length && this.musicRampInterval !== null) {
                window.clearInterval(this.musicRampInterval);
                this.musicRampInterval = null;
                onDone === null || onDone === void 0 ? void 0 : onDone();
            }
        }, stepMs);
    }
    /** Drop any in-flight ramp — duck or fade — and all of its state. Restores
     *  nothing: callers either post the user volume next (postMusicVolume) or are
     *  tearing the iframe down. Any pending pauseVideo/stopVideo goes with it. */
    cancelMusicRamps() {
        this.clearMusicRampTimers();
        this.musicRampLevel = null;
        this.musicFadePhase = null;
    }
    clearMusicRampTimers() {
        if (this.musicRampInterval !== null) {
            window.clearInterval(this.musicRampInterval);
            this.musicRampInterval = null;
        }
        if (this.duckRestoreTimeout !== null) {
            window.clearTimeout(this.duckRestoreTimeout);
            this.duckRestoreTimeout = null;
        }
        if (this.musicFadeArmTimeout !== null) {
            window.clearTimeout(this.musicFadeArmTimeout);
            this.musicFadeArmTimeout = null;
        }
    }
    /**
     * React to a reported player state, from either onStateChange or an
     * infoDelivery that carried one.
     *
     * Ordering is load-bearing: updateMusicButtons is what advances
     * musicPlayerState, and both the stall notice and the transition checks here
     * read it as the *previous* state, so it must stay last.
     */
    handleMusicState(state) {
        if (state !== this.musicPlayerState) {
            // A ⏹ whose stopVideo has gone out (no fade still running) is settled the
            // moment the embed reports a halt: the straggler window musicStopPending
            // exists for — PLAYING clocks arriving after the stop — closes on this
            // transition, and from here the audibility gate blocks recording anyway.
            // Leaving the flag up would keep position recording dead through a later
            // resume (media keys never pass through ♪, which is the other clearer).
            if (this.musicStopPending && this.musicFadePhase === null && !this.isAudibleState(state)) {
                this.musicStopPending = false;
            }
            if (state === YT_STATE.PAUSED) {
                // The position only lives in memory while playing — pausing is the
                // boundary that has to reach disk, and it's the main way users leave.
                this.plugin.flushMusicPosition();
            }
            else if (state === YT_STATE.ENDED) {
                // Finished: next time this track opens at the top. With loop on, the
                // restart re-records from ~0 a moment later.
                this.plugin.clearMusicPosition();
            }
            else if (this.pendingResumeSeconds !== null && this.isAudibleState(state)) {
                // Resume, the moment playback actually starts. Seeking is documented as
                // safe only from a running player (from a *cued* one it would start
                // playback, which is exactly the auto-play this feature must not do), so
                // the offset waits here rather than riding along in the embed URL.
                // BUFFERING usually arrives first, so the jump lands before any audio.
                const seconds = this.pendingResumeSeconds;
                this.pendingResumeSeconds = null;
                this.resumeSeekLanding = seconds;
                this.postToMusicPlayer(buildPlayerCommand("seekTo", [seconds, true]));
            }
            // The armed fade-in starts the moment audio does — PLAYING, not
            // BUFFERING, which is still silence. It stands down only on a genuine
            // halt (PAUSED/ENDED — iOS pausing on background, an external pause):
            // the embed can report transient UNSTARTED/CUED on its way to playing,
            // and treating those as dead ends would cancel the fade and let the
            // music snap in at full volume. A player that truly never starts is the
            // arm timeout's job, and ⏸/⏹ pressed during the gap resolve the phase in
            // their own handlers.
            if (this.musicFadePhase === "armed") {
                if (state === YT_STATE.PLAYING) {
                    this.beginMusicFadeIn();
                }
                else if (state === YT_STATE.PAUSED || state === YT_STATE.ENDED) {
                    this.musicFadePhase = null;
                    this.postMusicVolume();
                }
            }
            else if (this.musicFadePhase === null &&
                this.isAudibleState(state) &&
                !this.isAudibleState(this.musicPlayerState) &&
                this.musicRampInterval === null &&
                this.duckRestoreTimeout === null &&
                this.musicRampLevel !== null) {
                // The player left a halted state while the volume was parked below the
                // setting with no ramp left to lift it — a landed ⏸/⏹ fade leaves the
                // embed at 0, and hardware media keys can resume it without going
                // through ♪. In 0.5.3 this was audible (pause kept the user volume);
                // silent playback with ⏸ showing would be the regression. Requiring the
                // *previous* state to be halted is what keeps this off the stragglers a
                // landing races (a PLAYING report crossing the just-posted pauseVideo
                // arrives from a still-audible previous state). Unreachable during a
                // duck (its hold keeps duckRestoreTimeout set) and during our own ♪
                // press (the phase is "armed" there).
                if (state === YT_STATE.PLAYING) {
                    this.beginMusicFadeIn();
                }
                else {
                    // BUFFERING: audio hasn't started — re-arm instead of fading through
                    // the silence, and the existing armed machinery finishes the job.
                    this.musicFadePhase = "armed";
                    this.scheduleMusicFadeArmBackstop();
                }
            }
        }
        this.maybeNotifyMusicStalled(state);
        this.maybeNotifyMusicEnded(state);
        this.updateMusicButtons(state);
    }
    /** Playing or buffering — i.e. the player is running, not cued or paused. */
    isAudibleState(state) {
        return state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING;
    }
    /**
     * Hand a reported playback position to the plugin's store. Live streams and
     * the final seconds of a track are filtered out by isResumablePosition; the
     * "too early to bother resuming" floor lives on the *apply* side instead, so
     * that a restarted track immediately overwrites a stale offset here.
     *
     * Only an audibly-running player is recorded. A cued one also reports a clock
     * (at 0), which would otherwise let a second, idle panel — or the moment just
     * after ⏹ Stop — reset a position the playing panel had banked. Note the
     * state read here is the *previous* one (updateMusicButtons advances it after
     * this runs), which is also what keeps the first 0 of a resumed track from
     * overwriting the very offset it was built with.
     */
    trackMusicPosition(seconds) {
        if (!this.isAudibleState(this.musicPlayerState))
            return;
        // ⏹ Stop forgets the position on the click, but audio keeps running through
        // the fade-out — without this, those last reported seconds would bank the
        // very position that was just cleared. Cleared again on the next ♪ press.
        if (this.musicStopPending)
            return;
        // A resume seek is posted while the embed is still reporting the old clock,
        // so ignore readings until it lands — otherwise the first ~second of
        // playback overwrites the very position we just asked it to jump to. If the
        // seek is never honoured nothing is recorded, which leaves the stored
        // position intact and the next open resumes from it again.
        if (this.resumeSeekLanding !== null) {
            if (seconds < this.resumeSeekLanding - RESUME_SEEK_LANDING_TOLERANCE_S)
                return;
            this.resumeSeekLanding = null;
        }
        const videoId = this.musicCurrentVideoId;
        if (videoId === null)
            return;
        if (!isResumablePosition(seconds, this.musicCurrentDuration))
            return;
        this.plugin.recordMusicPosition({
            videoId,
            playlistId: this.musicTargetPlaylistId,
            seconds,
        });
    }
    /**
     * Swap the ♪ play/pause buttons to match the reported player state (the
     * same .gp-hidden swap the main start/pause buttons use). Guarded so the
     * ~4Hz infoDelivery stream doesn't produce redundant DOM writes.
     */
    updateMusicButtons(state) {
        if (state === this.musicPlayerState)
            return;
        this.musicPlayerState = state;
        // A fade-out wins: the player genuinely keeps running through it, so a
        // rebuffer or a playlist advance landing mid-fade would otherwise put the
        // ⏸ button back moments after the user pressed it.
        this.setMusicButtonsPlaying(this.musicFadePhase === "out" ? false : this.isAudibleState(state));
    }
    /**
     * Do the ♪/⏸ swap itself. Split out of updateMusicButtons so a fade-out can
     * flip the buttons the moment it starts: the pause/stop command is already
     * guaranteed to go out, and waiting a fade-length for YouTube to confirm it
     * would leave the button looking dead. Deliberately does NOT touch
     * musicPlayerState — the real transition still has to arrive for the
     * position flush, the resume seek and the notices to run off it.
     */
    setMusicButtonsPlaying(playing) {
        var _a, _b;
        (_a = this.musicPlayBtn) === null || _a === void 0 ? void 0 : _a.toggleClass("gp-hidden", playing);
        (_b = this.musicPauseBtn) === null || _b === void 0 ? void 0 : _b.toggleClass("gp-hidden", !playing);
    }
    /**
     * Surface a *lasting* BUFFERING state as a Notice — a network stall is just
     * silence with the player hidden. Armed once per stall episode (on the
     * transition into BUFFERING), disarmed the moment any other state arrives;
     * normal track starts and brief rebuffers stay under the delay. The player
     * self-recovers when the connection returns, so this only informs — it never
     * pauses or reloads anything. Rate-limited so a flapping connection doesn't
     * nag: at most one notice per MUSIC_STALL_RENOTIFY_MS.
     */
    maybeNotifyMusicStalled(state) {
        if (state !== YT_STATE.BUFFERING) {
            if (this.musicStallTimeout !== null) {
                window.clearTimeout(this.musicStallTimeout);
                this.musicStallTimeout = null;
            }
            return;
        }
        // Arm only on the transition into BUFFERING — the ~4Hz infoDelivery stream
        // repeats the state, and after the timeout fires (timeout null, state still
        // BUFFERING) those repeats must not re-arm it within the same episode.
        if (this.musicStallTimeout !== null || this.musicPlayerState === YT_STATE.BUFFERING)
            return;
        this.musicStallTimeout = window.setTimeout(() => {
            this.musicStallTimeout = null;
            const now = Date.now();
            if (now - this.musicStallNotifiedAt < MUSIC_STALL_RENOTIFY_MS &&
                this.musicStallNotifiedAt !== 0)
                return;
            this.musicStallNotifiedAt = now;
            new obsidian.Notice("Gentle pomodoro: the music is buffering — slow or lost connection. It resumes by itself once the network is back; if it stays silent, press ⏹ then ♪ to reload.");
        }, MUSIC_STALL_NOTICE_DELAY_MS);
    }
    /**
     * Surface a *lasting* ENDED state as a Notice — with the player hidden there
     * is nothing to show that playback truly stopped (a finished video with loop
     * off, or a live stream going offline). Playlist auto-advance and loop
     * restarts pass through ENDED and resume within ~a second, so the Notice is
     * armed on a playing→ENDED transition and disarmed if playback resumes
     * before MUSIC_ENDED_NOTICE_DELAY_MS.
     *
     * Never armed during a ⏸/⏹ fade-out. The user has just asked for silence and
     * the audio runs on for the length of the fade, so a track that happens to
     * end inside that window would answer the button press with "the music ended
     * — paste a new link". Stopping on purpose is not news.
     */
    maybeNotifyMusicEnded(state) {
        if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
            if (this.musicEndedTimeout !== null) {
                window.clearTimeout(this.musicEndedTimeout);
                this.musicEndedTimeout = null;
            }
            return;
        }
        if (this.musicFadePhase === "out")
            return;
        const wasAudible = this.musicPlayerState === YT_STATE.PLAYING || this.musicPlayerState === YT_STATE.BUFFERING;
        if (state === YT_STATE.ENDED && wasAudible && this.musicEndedTimeout === null) {
            this.musicEndedTimeout = window.setTimeout(() => {
                this.musicEndedTimeout = null;
                new obsidian.Notice("Gentle pomodoro: the music ended — a live stream may have gone offline. Press ♪ to play again or paste a new link.");
            }, MUSIC_ENDED_NOTICE_DELAY_MS);
        }
    }
    /**
     * Surface an embed error as a Notice — with the player hidden there is no
     * visible error screen, so without this a broken URL is just a dead Play
     * button. Once per iframe build (the embed can re-emit onError).
     */
    notifyMusicError(code) {
        if (this.musicErrorNotified)
            return;
        this.musicErrorNotified = true;
        const message = code === 101 || code === 150
            ? "Gentle pomodoro: this video doesn't allow embedding — try another URL."
            : "Gentle pomodoro: the music video can't be played (unavailable or restricted).";
        new obsidian.Notice(message);
    }
    /**
     * Format a projected end timestamp as a localized wall-clock time — "Ends
     * 15:30" (or "Ends 3:30 PM" per locale, via moment's LT). When the session
     * finishes on a later calendar day than now (a late start plus a long
     * session), append "(+1 day)" — or "(+N days)" in the extreme. The delta is
     * measured on local-midnight boundaries (startOf("day")), so it counts
     * calendar days and stays correct across DST rather than counting 24h chunks.
     */
    formatEndTime(endMs) {
        const end = moment(endMs);
        const time = end.format("LT");
        // startOf mutates `end` in place; it isn't read again after this.
        const dayDelta = end.startOf("day").diff(moment().startOf("day"), "days");
        if (dayDelta <= 0)
            return `Ends ${time}`;
        const suffix = dayDelta === 1 ? "+1 day" : `+${dayDelta} days`;
        return `Ends ${time} (${suffix})`;
    }
    getDayNightIcon(state) {
        if (state.mode === "focus") {
            if (state.remainingMs <= 0)
                return "moon";
            if (state.remainingMs <= state.totalMs / 2)
                return "sunset";
            return "sun";
        }
        if (state.remainingMs <= 0)
            return "sun";
        if (state.remainingMs <= state.totalMs / 2)
            return "sunrise";
        return "moon";
    }
    /** Re-render the task picker. Sources tasks via taskLoader so regex parsing stays centralized. */
    loadTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            this.taskListContainer.empty();
            const clearItem = this.taskListContainer.createDiv("gp-task-item");
            clearItem.addClass("gp-task-item-clear");
            obsidian.setIcon(clearItem, "x-circle");
            clearItem.createSpan({ text: "Unlink Current Task" });
            this.registerDomEvent(clearItem, "click", () => {
                this.timer.setTask(NO_TASK_LABEL);
                this.taskListVisible = false;
                this.taskListContainer.removeClass("gp-visible");
            });
            const tasks = yield loadTasks(this.plugin.app, {
                tasksPath: this.plugin.settings.tasksPath,
                limitDays: this.plugin.settings.taskSelectorDays,
            });
            const groups = groupTasksByDate(tasks);
            if (groups.length === 0) {
                // An empty tasksPath scans the whole vault, so "no path + no results"
                // almost always means task linking was never set up — nudge instead.
                const configured = this.plugin.settings.tasksPath.trim() !== "";
                const empty = this.taskListContainer.createDiv("gp-task-empty");
                obsidian.setIcon(empty.createDiv("gp-task-empty-icon"), configured ? "calendar-check" : "folder-search");
                empty.createDiv({
                    cls: "gp-task-empty-title",
                    text: configured ? "All clear" : "Nothing here yet",
                });
                empty.createDiv({
                    cls: "gp-task-empty-hint",
                    text: configured
                        ? `No tasks scheduled or due in the next ${this.plugin.settings.taskSelectorDays} days.`
                        : "Set a Tasks folder path in the plugin settings to pick tasks here.",
                });
                return;
            }
            for (const group of groups) {
                this.taskListContainer.createDiv("gp-task-group-header").setText(group.label);
                for (const task of group.items) {
                    const item = this.taskListContainer.createDiv("gp-task-item");
                    item.createSpan({ text: task.displayText });
                    if (task.cleanText === this.timer.currentTaskName &&
                        task.path === this.timer.currentTaskPath) {
                        item.addClass("gp-task-selected");
                        const iconContainer = item.createDiv("gp-task-check-icon");
                        obsidian.setIcon(iconContainer, "check");
                    }
                    this.registerDomEvent(item, "click", () => {
                        this.timer.setTask(task.cleanText, task.path, task.taskId);
                        this.taskListVisible = false;
                        this.taskListContainer.removeClass("gp-visible");
                    });
                }
            }
        });
    }
    renderSettingsPanel() {
        this.settingsPanel.empty();
        const settings = this.plugin.settings;
        const section = (label) => {
            this.settingsPanel.createDiv({ cls: "gp-settings-section-label", text: label });
        };
        const numberRow = (label, initial, onChange) => {
            const row = this.settingsPanel.createDiv("gp-settings-row");
            row.createSpan({ text: label });
            const input = row.createEl("input", { type: "number" });
            input.value = initial.toString();
            this.registerDomEvent(input, "change", () => {
                const val = parseInt(input.value);
                if (val > 0)
                    void onChange(val);
            });
            this.registerDomEvent(input, "keydown", (e) => {
                if (e.key === "Enter")
                    input.blur();
            });
        };
        const toggleRow = (label, initial, onChange) => {
            const row = this.settingsPanel.createDiv("gp-settings-row");
            row.createSpan({ text: label });
            const wrap = row.createEl("label", { cls: "gp-toggle" });
            const input = wrap.createEl("input", { type: "checkbox" });
            input.checked = initial;
            wrap.createSpan({ cls: "gp-toggle-slider" });
            this.registerDomEvent(input, "change", () => void onChange(input.checked));
        };
        const segmentedRow = (label, options, initial, onChange) => {
            var _a;
            const row = this.settingsPanel.createDiv("gp-settings-row");
            row.createSpan({ text: label });
            const seg = row.createDiv({ cls: "gp-segmented", attr: { role: "radiogroup" } });
            // For numeric values we pick the option closest to `initial` (e.g. volume:
            // tolerate any past saved float). For other types, strict equality.
            const initialOpt = typeof initial === "number"
                ? options.reduce((best, opt) => Math.abs(opt.value - initial) <
                    Math.abs(best.value - initial)
                    ? opt
                    : best)
                : ((_a = options.find((o) => o.value === initial)) !== null && _a !== void 0 ? _a : options[0]);
            const buttons = [];
            for (const opt of options) {
                const btn = seg.createEl("button", { cls: "gp-segmented-btn", text: opt.label });
                btn.type = "button";
                btn.setAttribute("role", "radio");
                const isActive = opt === initialOpt;
                btn.setAttribute("aria-checked", String(isActive));
                if (isActive)
                    btn.addClass("is-active");
                buttons.push(btn);
                this.registerDomEvent(btn, "click", () => {
                    for (const b of buttons) {
                        b.removeClass("is-active");
                        b.setAttribute("aria-checked", "false");
                    }
                    btn.addClass("is-active");
                    btn.setAttribute("aria-checked", "true");
                    void onChange(opt.value);
                });
            }
        };
        section("Timing");
        numberRow("Focus (m)", settings.focusMinutes, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.focusMinutes = v;
            yield this.plugin.saveSettings();
            this.timer.updateDuration("focus", v);
        }));
        numberRow("Break (m)", settings.breakMinutes, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.breakMinutes = v;
            yield this.plugin.saveSettings();
            this.timer.updateDuration("break", v);
        }));
        section("Audio");
        toggleRow("Sound", settings.soundEnabled, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.soundEnabled = v;
            yield this.plugin.saveSettings();
        }));
        segmentedRow("Volume", [
            { label: "Low", value: 0.3 },
            { label: "Mid", value: 0.7 },
            { label: "High", value: 1.0 },
        ], settings.soundVolume, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.soundVolume = v;
            yield this.plugin.saveSettings();
        }));
        segmentedRow("Music volume", [
            { label: "Low", value: 0.3 },
            { label: "Mid", value: 0.7 },
            { label: "High", value: 1.0 },
        ], settings.musicVolume, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.musicVolume = v;
            yield this.plugin.saveSettings();
            // Live-apply to this view's playing iframe; other open views converge
            // via the lastAppliedMusicVolume guard in their applySettings.
            this.postMusicVolume();
        }));
        section("Auto-start");
        toggleRow("Auto-start break", settings.autoStartBreak, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.autoStartBreak = v;
            yield this.plugin.saveSettings();
        }));
        toggleRow("Auto-start focus", settings.autoStartFocus, (v) => __awaiter(this, void 0, void 0, function* () {
            settings.autoStartFocus = v;
            yield this.plugin.saveSettings();
        }));
        const resetWrap = this.settingsPanel.createDiv("gp-settings-reset");
        const resetBtn = resetWrap.createEl("button", {
            cls: "gp-reset-button",
            text: "Reset to defaults",
        });
        resetBtn.type = "button";
        this.registerDomEvent(resetBtn, "click", () => __awaiter(this, void 0, void 0, function* () {
            settings.focusMinutes = DEFAULT_SETTINGS.focusMinutes;
            settings.breakMinutes = DEFAULT_SETTINGS.breakMinutes;
            settings.soundEnabled = DEFAULT_SETTINGS.soundEnabled;
            settings.soundVolume = DEFAULT_SETTINGS.soundVolume;
            settings.musicVolume = DEFAULT_SETTINGS.musicVolume;
            settings.autoStartBreak = DEFAULT_SETTINGS.autoStartBreak;
            settings.autoStartFocus = DEFAULT_SETTINGS.autoStartFocus;
            yield this.plugin.saveSettings();
            this.timer.updateDuration("focus", settings.focusMinutes);
            this.timer.updateDuration("break", settings.breakMinutes);
            this.postMusicVolume();
            this.renderSettingsPanel();
        }));
    }
}

// Lightweight logging helpers that auto-prefix "[GentlePomo]" so the maintainer
// can grep plugin output out of Obsidian's developer console.
const PREFIX = "[GentlePomo]";
// Note: console.log is disallowed by obsidianmd's recommended ESLint config.
// Use logger.debug for verbose tracing, warn/error for real diagnostics.
const logger = {
    warn(message, ...rest) {
        console.warn(`${PREFIX} ${message}`, ...rest);
    },
    error(message, ...rest) {
        console.error(`${PREFIX} ${message}`, ...rest);
    },
    debug(message, ...rest) {
        console.debug(`${PREFIX} ${message}`, ...rest);
    },
};

// Pure helper: format a completed session as a single log line.
// Exported so tests can lock in the inline-field schema that users' Dataview queries depend on.
function formatLogLine(session) {
    let totalPauseMs = 0;
    const pauseStrings = session.pauses.map((p) => {
        totalPauseMs += p.end.diff(p.start);
        return `${p.start.format("YYYY-MM-DD HH:mm:ss")} - ${p.end.format("YYYY-MM-DD HH:mm:ss")}`;
    });
    const totalDurationMs = session.endTime.diff(session.startTime) - totalPauseMs;
    const totalSeconds = Math.floor(totalDurationMs / 1000);
    const scheduledSeconds = session.scheduledDurationMinutes * 60;
    const startFmt = session.startTime.format("YYYY-MM-DD HH:mm:ss");
    const endFmt = session.endTime.format("YYYY-MM-DD HH:mm:ss");
    if (session.mode === "focus") {
        let taskStr = session.taskName === "No Task" ? "No Task" : `${session.taskName}`;
        if (session.taskPath && session.taskName !== "No Task") {
            taskStr = `[[${session.taskPath}|${session.taskName}]]`;
        }
        const pauseJson = JSON.stringify(pauseStrings);
        const idStr = session.taskId ? ` | ID:: ${session.taskId}` : "";
        return `- 🍅 Focus | Task:: ${taskStr}${idStr} | Start:: ${startFmt} | End:: ${endFmt} | Scheduled:: ${scheduledSeconds} | Pauses:: ${pauseJson} | Total:: ${totalSeconds} | Status:: ${session.status} | Type:: focus`;
    }
    const breakTypeStr = session.breakType === "long" ? "long-break" : "short-break";
    return `- ☕ Rest | Start:: ${startFmt} | End:: ${endFmt} | Scheduled:: ${scheduledSeconds} | Total:: ${totalSeconds} | Type:: ${breakTypeStr}`;
}
/**
 * Pure helper: should the "daily goal hit" notice fire?
 *
 * Returns true when all of:
 *  - goal is configured (> 0 minutes)
 *  - notice is enabled
 *  - current focus seconds today have crossed the goal threshold
 *  - notice hasn't already fired today (date-keyed flag)
 */
function shouldFireGoalNotice(currentSeconds, goalMinutes, noticeEnabled, lastGoalHitDate, today) {
    if (goalMinutes <= 0)
        return false;
    if (!noticeEnabled)
        return false;
    if (currentSeconds < goalMinutes * 60)
        return false;
    if (lastGoalHitDate === today)
        return false;
    return true;
}
/**
 * Pure helper: seconds to count from the cached focus-total base.
 *
 * The base was summed from the log file of `baseDate`, so it only describes
 * that local day. Once midnight rolls over it is yesterday's total and must
 * count as 0 until a fresh fetch lands — otherwise an app kept open across
 * midnight feeds yesterday's seconds into the goal math and fires a spurious
 * "goal hit" notice on the first session of the new day.
 */
function effectiveFocusBaseSeconds(baseSeconds, baseDate, today) {
    return baseDate === today ? baseSeconds : 0;
}
// Pure helper: sum Total:: seconds across focus lines in a log file's content.
// Skipped sessions (Status:: cancelled) are forfeited — they don't count toward
// the daily goal (classic pomodoro: an interrupted session doesn't count; Stop
// logs `finished` and still counts, Skip is the discard gesture). Only an
// explicit `cancelled` is excluded, so hand-edited lines without a Status::
// field still count.
function parseFocusTotalSeconds(content) {
    const lines = content.split("\n");
    let total = 0;
    for (const line of lines) {
        if (!line.includes("🍅 Focus"))
            continue;
        if (/Status::\s*cancelled/.test(line))
            continue;
        const totalMatch = line.match(/Total::\s*(\d+)/);
        if (!totalMatch)
            continue;
        const seconds = parseInt(totalMatch[1], 10);
        if (!Number.isNaN(seconds))
            total += seconds;
    }
    return total;
}
class LogManager {
    constructor(plugin) {
        this.currentSession = null;
        this.currentPauseStart = null;
        this.focusTotalCacheDate = null;
        this.focusTotalCacheSeconds = 0;
        this.focusTotalCacheAt = 0;
        this.plugin = plugin;
    }
    /** Open a new session or resume from pause (idempotent if a session is already active). */
    startSession(mode, taskName, durationMinutes, taskPath, taskId, breakType) {
        // If a session is already active (e.g. resuming from pause), don't overwrite start time
        if (this.currentSession) {
            this.resumeSession();
            return;
        }
        this.currentSession = {
            mode,
            taskName: taskName || "No Task",
            taskPath,
            taskId,
            scheduledDurationMinutes: durationMinutes,
            startTime: moment(),
            pauses: [],
            status: "cancelled",
            breakType,
        };
    }
    pauseSession() {
        if (!this.currentSession)
            return;
        this.currentPauseStart = moment();
    }
    resumeSession() {
        var _a;
        if (!this.currentSession || !this.currentPauseStart)
            return;
        const pauseEnd = moment();
        (_a = this.currentSession.pauses) === null || _a === void 0 ? void 0 : _a.push({
            start: this.currentPauseStart,
            end: pauseEnd,
        });
        this.currentPauseStart = null;
    }
    // Allow updating task name mid-session
    updateTask(newTaskName, newTaskPath, newTaskId) {
        if (this.currentSession) {
            this.currentSession.taskName = newTaskName || "No Task";
            this.currentSession.taskPath = newTaskPath;
            this.currentSession.taskId = newTaskId;
        }
    }
    /** Close the active session and append a log line; invalidates today's focus-total cache. */
    endSession(status) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentSession)
                return;
            // If we were paused when ending, close the pause loop
            if (this.currentPauseStart) {
                this.resumeSession();
            }
            const session = Object.assign(Object.assign({}, this.currentSession), { endTime: moment(), status });
            yield this.writeLog(session);
            // Reset state
            this.currentSession = null;
            this.currentPauseStart = null;
        });
    }
    /** Rewrite the Task:: field on all log lines that reference `taskId`. Used when the task is renamed. */
    updateLoggedTaskName(taskId, taskName, taskPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = this.plugin.settings.logFolderPath;
            if (!folderPath || !taskId)
                return;
            const app = this.plugin.app;
            const files = app.vault
                .getFiles()
                .filter((f) => f.extension === "md" && isPathInFolder(f.path, folderPath));
            if (files.length === 0)
                return;
            for (const file of files) {
                const content = yield app.vault.read(file);
                const lines = content.split("\n");
                let changed = false;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.includes("🍅 Focus") || !line.includes(`| ID:: ${taskId} |`))
                        continue;
                    const updated = this.updateLogLineTaskName(line, taskId, taskName, taskPath);
                    if (updated !== line) {
                        lines[i] = updated;
                        changed = true;
                    }
                }
                if (changed) {
                    yield app.vault.modify(file, lines.join("\n"));
                }
            }
        });
    }
    /** Refresh ALL log files' Task:: fields by re-resolving each ID-bearing line against the source task. */
    refreshLoggedTaskNamesById() {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = this.plugin.settings.logFolderPath;
            if (!folderPath) {
                new obsidian.Notice("Gentle pomodoro: log folder path is not set.");
                return;
            }
            const app = this.plugin.app;
            const logFiles = app.vault
                .getFiles()
                .filter((f) => f.extension === "md" && isPathInFolder(f.path, folderPath));
            if (logFiles.length === 0) {
                new obsidian.Notice("Gentle pomodoro: no log files found.");
                return;
            }
            const taskContentCache = new Map();
            const taskNameCache = new Map();
            let filesUpdated = 0;
            let linesUpdated = 0;
            for (const file of logFiles) {
                const content = yield app.vault.read(file);
                const lines = content.split("\n");
                let changed = false;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const ref = this.parseLogLineTaskRef(line);
                    if (!ref || !ref.taskPath)
                        continue;
                    const cacheKey = `${ref.taskPath}::${ref.taskId}`;
                    let latestName = taskNameCache.get(cacheKey);
                    if (latestName === undefined) {
                        let taskContent = taskContentCache.get(ref.taskPath);
                        if (taskContent === undefined) {
                            const taskFile = app.vault.getAbstractFileByPath(ref.taskPath);
                            if (taskFile instanceof obsidian.TFile) {
                                taskContent = yield app.vault.read(taskFile);
                            }
                            else {
                                taskContent = null;
                            }
                            taskContentCache.set(ref.taskPath, taskContent);
                        }
                        latestName = taskContent ? findTaskNameByIdInContent(taskContent, ref.taskId) : null;
                        taskNameCache.set(cacheKey, latestName);
                    }
                    if (!latestName)
                        continue;
                    const updated = this.updateLogLineTaskName(line, ref.taskId, latestName, ref.taskPath);
                    if (updated !== line) {
                        lines[i] = updated;
                        changed = true;
                        linesUpdated += 1;
                    }
                }
                if (changed) {
                    yield app.vault.modify(file, lines.join("\n"));
                    filesUpdated += 1;
                }
            }
            new obsidian.Notice(`[GentlePomo] Updated ${linesUpdated} log line(s) across ${filesUpdated} file(s).`);
        });
    }
    parseLogLineTaskRef(line) {
        if (!line.includes("🍅 Focus") || !line.includes("| ID:: "))
            return null;
        const idMatch = line.match(/\|\s*ID::\s*([^|]+)\s*\|/);
        if (!idMatch)
            return null;
        const taskSegmentRegex = /Task::\s(\[\[[^\]]+\]\]|[^|]+)\s\|/;
        const taskMatch = line.match(taskSegmentRegex);
        if (!taskMatch)
            return null;
        const taskStr = taskMatch[1].trim();
        const linkMatch = taskStr.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/);
        const taskPath = linkMatch ? linkMatch[1] : undefined;
        return { taskId: idMatch[1].trim(), taskPath };
    }
    updateLogLineTaskName(line, taskId, taskName, taskPath) {
        if (!line.includes(`| ID:: ${taskId} |`))
            return line;
        const taskSegmentRegex = /Task::\s(\[\[[^\]]+\]\]|[^|]+)\s\|/;
        const match = line.match(taskSegmentRegex);
        if (!match)
            return line;
        const oldTaskStr = match[1].trim();
        const linkMatch = oldTaskStr.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/);
        const pathToUse = taskPath || (linkMatch ? linkMatch[1] : undefined);
        const safeName = taskName || "No Task";
        const newTaskStr = pathToUse && safeName !== "No Task" ? `[[${pathToUse}|${safeName}]]` : safeName;
        return line.replace(taskSegmentRegex, `Task:: ${newTaskStr} |`);
    }
    writeLog(session) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = this.plugin.settings.logFolderPath;
            if (!folderPath)
                return; // Logging disabled if no path set
            const app = this.plugin.app;
            // Refresh task name from file if ID is available (handles renames)
            if (session.mode === "focus" && session.taskId && session.taskPath) {
                const latestName = yield findTaskNameById(app, session.taskPath, session.taskId);
                if (latestName) {
                    session.taskName = latestName;
                }
            }
            const normalizedFolder = obsidian.normalizePath(folderPath);
            // File name is based on the session's start time (local date).
            const dateStr = session.startTime.format("YYYY-MM-DD");
            const fileName = `${dateStr}-gentle-pomodoro-log.md`;
            const filePath = obsidian.normalizePath(`${normalizedFolder}/${fileName}`);
            // Format the line via the pure helper (tested in tests/logManager.test.ts).
            const line = formatLogLine(session);
            // Writes can fail on mobile (Obsidian Sync / iCloud conflicts, locked files).
            // Catch here so a write failure never breaks the timer state machine — the
            // caller (endSession → handleFinished/skip) still resolves and advances —
            // and so the user is told instead of losing the session silently.
            try {
                yield this.ensureFolder(normalizedFolder);
                yield this.appendLine(filePath, line);
            }
            catch (e) {
                logger.error("Failed to write session log", e);
                new obsidian.Notice("Gentle pomodoro: couldn't write the session log — check the log folder setting.");
                return;
            }
            if (session.mode === "focus") {
                // Invalidate both total caches: the inner one here, and the plugin-level
                // TTL, so the next emit's refetch reads the fresh file immediately and
                // the goal notice (which fires from that refetch's landing) arrives with
                // the end-of-session bell instead of up to a TTL later.
                this.focusTotalCacheAt = 0;
                this.plugin.invalidateFocusTotalCache();
            }
        });
    }
    /** Create the log folder if missing, tolerating a sync race that creates it first. */
    ensureFolder(normalizedFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = this.plugin.app;
            if (yield app.vault.adapter.exists(normalizedFolder))
                return;
            try {
                yield app.vault.createFolder(normalizedFolder);
            }
            catch (e) {
                // A concurrent write or sync may have created it between the check and
                // here; only swallow that case, re-throw anything else.
                if (yield app.vault.adapter.exists(normalizedFolder))
                    return;
                throw e;
            }
        });
    }
    /**
     * Append a line to the daily log, creating the file if needed. Resolves the
     * file through the Vault index but falls back to the adapter when the index
     * lags the filesystem (common on mobile right after create / on sync) — the
     * previous adapter.exists()-then-getAbstractFileByPath() mix could silently
     * drop a line when the two disagreed.
     */
    appendLine(filePath, line) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = this.plugin.app;
            const existing = app.vault.getAbstractFileByPath(filePath);
            if (existing instanceof obsidian.TFile) {
                yield app.vault.append(existing, `\n${line}`);
                return;
            }
            try {
                yield app.vault.create(filePath, line);
            }
            catch (_a) {
                // Index lagged the filesystem: the file exists on disk but wasn't in the
                // Vault index, so create() throws "already exists". Append at the adapter
                // level instead of dropping the session.
                yield app.vault.adapter.append(filePath, `\n${line}`);
            }
        });
    }
    /** Today's total focus seconds, summed from today's log file. Cached for FOCUS_TOTAL_CACHE_TTL_MS. */
    getTodayFocusSeconds() {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = this.plugin.settings.logFolderPath;
            if (!folderPath)
                return 0;
            const dateStr = moment().format("YYYY-MM-DD");
            const now = Date.now();
            if (this.focusTotalCacheDate === dateStr &&
                now - this.focusTotalCacheAt < FOCUS_TOTAL_CACHE_TTL_MS) {
                return this.focusTotalCacheSeconds;
            }
            const fileName = `${dateStr}-gentle-pomodoro-log.md`;
            const normalizedFolder = obsidian.normalizePath(folderPath);
            const filePath = obsidian.normalizePath(`${normalizedFolder}/${fileName}`);
            const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof obsidian.TFile)) {
                this.focusTotalCacheDate = dateStr;
                this.focusTotalCacheSeconds = 0;
                this.focusTotalCacheAt = now;
                return 0;
            }
            const content = yield this.plugin.app.vault.read(file);
            const totalSeconds = parseFocusTotalSeconds(content);
            this.focusTotalCacheDate = dateStr;
            this.focusTotalCacheSeconds = totalSeconds;
            this.focusTotalCacheAt = now;
            return totalSeconds;
        });
    }
}

var warDrumUrl = "data:audio/mpeg;base64,SUQzAgAAAAAfdlRTUwAAHgBMb2dpYyBQcm8gQ3JlYXRvciBTdHVkaW8gMTIuM0NPTQAAaABlbmdpVHVuTk9STQAgMDAwMDAxMkEgMDAwMDAxN0YgMDAwMDA2OUYgMDAwMDBDQUQgMDAwMDAwNDggMDAwMDAzQzAgMDAwMDZDNjIgMDAwMDdFODYgMDAwMDAwMzAgMDAwMDAzQzAAQ09NAACCAGVuZ2lUdW5TTVBCACAwMDAwMDAwMCAwMDAwMDIxMCAwMDAwMDdENyAwMDAwMDAwMDAwMDE1RTE5IDAwMDAwMDAwIDAwMDEwRTAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

var bellUrl = "data:audio/mpeg;base64,SUQzAgAAAAAfdlRTUwAAHgBMb2dpYyBQcm8gQ3JlYXRvciBTdHVkaW8gMTIuM0NPTQAAaABlbmdpVHVuTk9STQAgMDAwMDExQjcgMDAwMDE0RTAgMDAwMDQ1QzkgMDAwMDU4QUMgMDAwMDAyNTggMDAwMDAyRDAgMDAwMDZCOEMgMDAwMDdFODYgMDAwMDAyNTggMDAwMDAyMjgAQ09NAACCAGVuZ2lUdW5TTVBCACAwMDAwMDAwMCAwMDAwMDIxMCAwMDAwMDg3MCAwMDAwMDAwMDAwMDJFRTAwIDAwMDAwMDAwIDAwMDI1QkMwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/75EAAAAAAADeAAAAAAAAG8AAAAAAAAN4AAAAAAAAbwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

var dingUrl = "data:audio/mpeg;base64,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xymiqawaWgxbYjF1E1LDFhMzFHpaE/G6GpFxUW1M7JScOG0vqHGkTouTlCOZHH7PhtLaQlGsUa0AQwwBLIgj6SlUJJPARD3Leye9OLnpm1mgCMx7a/sYCRqQWNxqFXyDATHhgET/0KAtqqqJUMusZj8KJJgYwYUuvtxgIm423zCjNqGqGimQ5TluQq1pYvzptZaZr2J+QVnUMWDM+a0NmYnZPTJpurUSo0ScoTIrlczXYXyeQ5+rZsp1ZJ6eKedvV0PUhT6uH2CRBIjyewS/EucsbRIhJYYCtajSRxPRcVTBL6QYTYl0eh/Gkoryva0lLaXFUt0UaFUoQSRJKnYwdAYIhQUExA5Hqn9URf8pGTKGBg0cjL/8yNQwUGjkZMsl/5ZPyNZahkZMoKORkyhgoMI5GTLI5GTWWw///9WrCgySQ6b1/XGM/7q+TqKSTGyO//vUZOkAhdB0sYnofPC+rrZGMG+eUY3IjUKN96qnu09EVL/QbqdlYmFtgX3FVxyk+HaRkviFrE/ep47T1Uiv//+c4/9qwoMtL63q0Fukh03/aDCkh0WWAP0VjCI0jlTquzsYOhIJCZDs7P7OUwiJDBMjs5UVf6/0VWdnKiKlji7D8lFZVOG/1GruG5uV8uv/7lGNXKKIhEQOg6IEbD82ruG63FfJ1FJJTvI8Tet61PM5KkyhbQgQKEKCI4PWXhHrDm8hw6eO6VRyk+KEzzoS6yzPYUskmcZxmkZ7LEn1vUZWqZeY3CeLbNLYvM7VKFE5EeDFFNG4WM8EsqUOP1cOEbRMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

// Centralized audio imports. @rollup/plugin-url inlines each as a base64
// data URL at build time, so main.js carries the audio bytes — no filesystem
// dependency at runtime.
const AUDIO_URLS = {
    "war-drum_short.mp3": warDrumUrl,
    "singing_bell_short.mp3": bellUrl,
    "ding-sound.mp3": dingUrl,
};

const TASK_ID_REGEX = /🆔\s*([A-Za-z0-9_-]+)/;
// Local-timezone YYYY-MM-DD; matches the format LogManager uses for daily log filenames.
const todayLocalStr$1 = () => moment().format("YYYY-MM-DD");
class TimerEngine {
    constructor(plugin) {
        this.intervalId = null;
        this.listeners = new Set();
        // Single shared AudioContext, created lazily. Reusing one persistent context
        // avoids the per-call `new AudioContext()` footgun: a context created off a
        // user gesture (e.g. a timer-triggered completion sound) can start in the
        // `suspended` state, and an un-retained context/source can be GC'd before
        // playback finishes. A live shared context keeps its active sources alive.
        this.audioCtx = null;
        // Decoded audio cache keyed by filename — decode each bundled asset once and
        // reuse its (immutable) AudioBuffer via a fresh BufferSource per play.
        this.audioBuffers = new Map();
        // Track the target end time (timestamp)
        this.targetTime = null;
        // Track current task name for logging
        this.currentTaskName = NO_TASK_LABEL;
        this.plugin = plugin;
        const total = plugin.settings.focusMinutes * ONE_MINUTE_MS;
        this.state = {
            mode: "focus",
            isRunning: false,
            remainingMs: total,
            totalMs: total,
            taskName: NO_TASK_LABEL,
            breakType: null,
        };
    }
    /** Update the active task and notify LogManager so future log lines reflect the change. */
    setTask(name, path, taskId) {
        this.currentTaskName = name;
        this.currentTaskPath = path;
        this.currentTaskId = taskId;
        this.state.taskName = name;
        this.plugin.logManager.updateTask(name, path, taskId);
        this.emit();
    }
    /**
     * Reaction to vault file changes. If the modified file holds the active task,
     * refreshes the task name (when ID is known) and auto-unlinks if it's now
     * completed (only while not currently running).
     */
    onFileModify(file) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Basic checks
            if (this.currentTaskName === NO_TASK_LABEL || !this.currentTaskPath)
                return;
            // 2. Check if modified file matches current task file
            if (file.path !== this.currentTaskPath)
                return;
            // 3. Refresh task name by ID (if available)
            if (this.currentTaskId) {
                const latestName = yield findTaskNameById(this.plugin.app, this.currentTaskPath, this.currentTaskId);
                if (latestName && latestName !== this.currentTaskName) {
                    this.setTask(latestName, this.currentTaskPath, this.currentTaskId);
                    yield this.plugin.logManager.updateLoggedTaskName(this.currentTaskId, latestName, this.currentTaskPath);
                }
            }
            // 4. If timer is running, do NOT unlink automatically (per requirements)
            if (this.state.isRunning)
                return;
            // 5. Check completion
            yield this.checkTaskCompletionAndUnlink();
        });
    }
    getState() {
        return Object.assign({}, this.state);
    }
    onChange(listener) {
        this.listeners.add(listener);
        listener(this.getState());
    }
    offChange(listener) {
        this.listeners.delete(listener);
    }
    emit() {
        const snapshot = this.getState();
        this.listeners.forEach((l) => l(snapshot));
    }
    clearLoop() {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    startLoop() {
        this.clearLoop();
        // Safety: Ensure targetTime is set if running
        if (this.state.isRunning && this.targetTime === null) {
            this.targetTime = Date.now() + this.state.remainingMs;
        }
        this.intervalId = window.setInterval(() => {
            if (!this.state.isRunning || this.targetTime === null)
                return;
            // Calculate remaining time based on system clock
            const now = Date.now();
            const prev = this.state.remainingMs;
            this.state.remainingMs = this.targetTime - now;
            // Natural completion: fire once on the tick that crosses zero. The
            // `prev > 0` guard guarantees this fires a single time (later ticks have
            // prev <= 0; a new session restores a positive remainingMs). Only act
            // when the next mode's auto-start toggle is on — otherwise fall through
            // and let the timer count up into overtime (unchanged behavior).
            if (prev > 0 && this.state.remainingMs <= 0) {
                const autoStart = this.state.mode === "focus"
                    ? this.plugin.settings.autoStartBreak
                    : this.plugin.settings.autoStartFocus;
                if (autoStart) {
                    this.state.remainingMs = 0; // freeze display at 00:00
                    this.clearLoop(); // stop ticking; completeNaturally restarts the loop
                    this.emit();
                    void this.completeNaturally();
                    return;
                }
            }
            this.emit();
        }, 50);
    }
    /**
     * Natural end-of-session handler (timer reached zero with auto-start on).
     * Plays the end cue, then reuses handleFinished() to log the session, advance
     * the long-break counter, and auto-start the next session. handleFinished()
     * itself plays no sound (finish() plays it first) — we mirror that here.
     */
    completeNaturally() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state.mode === "focus") {
                void this.playSound("singing_bell_short.mp3");
            }
            else {
                void this.playSound("ding-sound.mp3");
            }
            // Natural completion only fires when the toggle is on → auto-start the next.
            yield this.handleFinished(true);
        });
    }
    handleFinished(autoStartNext) {
        return __awaiter(this, void 0, void 0, function* () {
            // Log the finished session
            yield this.plugin.logManager.endSession("finished");
            // For focus sessions: optionally increment the task's pomodoro count
            // BEFORE the unlink check so we don't skip on a just-completed task.
            if (this.state.mode === "focus") {
                yield this.maybeIncrementTaskPomodoroCount();
            }
            // Check if task is completed and unlink if so
            yield this.checkTaskCompletionAndUnlink();
            if (this.state.mode === "focus") {
                // Advance the long-break counter, resetting at local-midnight rollover.
                const today = todayLocalStr$1();
                const counter = this.plugin.settings.sessionCounterDate === today
                    ? this.plugin.settings.sessionsSinceLongBreak + 1
                    : 1;
                this.plugin.settings.sessionsSinceLongBreak = counter;
                this.plugin.settings.sessionCounterDate = today;
                yield this.plugin.saveSettings();
                const longBreakEvery = Math.max(1, this.plugin.settings.longBreakEvery);
                const isLongBreak = counter % longBreakEvery === 0;
                this.switchMode("break", autoStartNext, isLongBreak);
            }
            else {
                this.switchMode("focus", autoStartNext);
            }
        });
    }
    /**
     * If the user has opted in (`incrementPomodoroCountOnFinish`), increment the
     * lifetime `🍅 N` marker on the linked task line. Best-effort: failures are
     * logged but never throw.
     */
    maybeIncrementTaskPomodoroCount() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.incrementPomodoroCountOnFinish)
                return;
            if (!this.currentTaskPath || this.currentTaskName === NO_TASK_LABEL)
                return;
            const file = this.plugin.app.vault.getAbstractFileByPath(this.currentTaskPath);
            if (!(file instanceof obsidian.TFile))
                return;
            try {
                // Atomic read-modify-write: `process` locks the file, so a concurrent
                // sync/plugin write can't be clobbered between our read and write.
                yield this.plugin.app.vault.process(file, (content) => {
                    const lines = content.split("\n");
                    let updatedIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        // Prefer ID match when available.
                        if (this.currentTaskId) {
                            const idMatch = line.match(TASK_ID_REGEX);
                            if (idMatch && idMatch[1] === this.currentTaskId) {
                                updatedIndex = i;
                                break;
                            }
                            continue;
                        }
                        // Fallback: match by normalized text on a task line (open or completed).
                        const taskMatch = line.match(TASK_LINE_REGEX);
                        if (taskMatch && normalizeTaskText(taskMatch[2]) === this.currentTaskName) {
                            updatedIndex = i;
                            break;
                        }
                    }
                    if (updatedIndex === -1)
                        return content;
                    lines[updatedIndex] = incrementPomodoroCount(lines[updatedIndex]);
                    return lines.join("\n");
                });
            }
            catch (e) {
                logger.warn("Failed to increment task pomodoro count", e);
            }
        });
    }
    checkTaskCompletionAndUnlink() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentTaskPath || this.currentTaskName === NO_TASK_LABEL)
                return;
            const file = this.plugin.app.vault.getAbstractFileByPath(this.currentTaskPath);
            if (!(file instanceof obsidian.TFile))
                return;
            try {
                const content = yield this.plugin.app.vault.read(file);
                // CRLF-safe split: this path only reads, and the $-anchored
                // TASK_LINE_REGEX can't match a line with a trailing \r. Write paths
                // (marker increment/repair) must keep split("\n") — they rejoin on "\n".
                const lines = content.split(/\r?\n/);
                let foundIncomplete = false;
                let foundComplete = false;
                for (const line of lines) {
                    // If current task has ID, match by ID
                    if (this.currentTaskId) {
                        const idMatch = line.match(TASK_ID_REGEX);
                        if (idMatch && idMatch[1] === this.currentTaskId) {
                            const taskMatch = line.match(TASK_LINE_REGEX);
                            if ((taskMatch === null || taskMatch === void 0 ? void 0 : taskMatch[1]) === " ") {
                                foundIncomplete = true;
                                break;
                            }
                            if (taskMatch) {
                                foundComplete = true;
                            }
                        }
                        continue;
                    }
                    // Fallback: match by normalized text
                    const taskMatch = line.match(TASK_LINE_REGEX);
                    if (taskMatch && normalizeTaskText(taskMatch[2]) === this.currentTaskName) {
                        if (taskMatch[1] === " ") {
                            foundIncomplete = true;
                            break;
                        }
                        foundComplete = true;
                    }
                }
                if (!foundIncomplete && foundComplete) {
                    this.setTask(NO_TASK_LABEL);
                }
            }
            catch (e) {
                logger.error("Failed to check task completion", e);
            }
        });
    }
    /** Lazily create (once) and return the shared AudioContext, or null if unsupported. */
    getAudioContext() {
        var _a;
        if (this.audioCtx)
            return this.audioCtx;
        const AudioContextCtor = (_a = window.AudioContext) !== null && _a !== void 0 ? _a : window.webkitAudioContext;
        if (!AudioContextCtor)
            return null;
        this.audioCtx = new AudioContextCtor();
        return this.audioCtx;
    }
    /**
     * Release engine resources on plugin unload: stop the tick loop, close the
     * shared AudioContext (Chromium caps live contexts, so leaking one per
     * disable/enable cycle would eventually silence all sound), and drop the
     * decoded-buffer cache.
     */
    dispose() {
        this.clearLoop();
        if (this.audioCtx) {
            void this.audioCtx.close().catch(() => { });
            this.audioCtx = null;
        }
        this.audioBuffers.clear();
    }
    playSound(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.soundEnabled)
                return;
            const dataUrl = AUDIO_URLS[filename];
            if (!dataUrl) {
                logger.debug(`Sound file not bundled: ${filename}`);
                return;
            }
            try {
                const ctx = this.getAudioContext();
                if (!ctx)
                    return;
                // A context created off a user gesture starts suspended; resume so a
                // timer-triggered completion sound is actually audible.
                if (ctx.state === "suspended")
                    yield ctx.resume();
                // Decode each bundled asset once, then reuse its AudioBuffer.
                let audioBuffer = this.audioBuffers.get(filename);
                if (!audioBuffer) {
                    // Strip the `data:audio/...;base64,` prefix and decode to bytes.
                    // Avoids fetch() (restricted by obsidianmd lint config) and the network round-trip.
                    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
                    const binary = window.atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    // decodeAudioData detaches `bytes.buffer`; harmless since we cache the
                    // resulting AudioBuffer and never touch the raw bytes again.
                    audioBuffer = yield ctx.decodeAudioData(bytes.buffer);
                    this.audioBuffers.set(filename, audioBuffer);
                }
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                const gain = ctx.createGain();
                gain.gain.value = this.plugin.settings.soundVolume;
                source.connect(gain);
                gain.connect(ctx.destination);
                // Dip any playing lofi music under the cue for exactly the clip's length
                // (view-side; no-op when nothing is playing).
                this.plugin.duckMusicInOpenViews(audioBuffer.duration);
                source.start(0);
            }
            catch (e) {
                logger.error(`Failed to play sound ${filename}:`, e);
            }
        });
    }
    /**
     * Transition to the given mode. When entering break, `isLongBreak` selects
     * `longBreakMinutes` over `breakMinutes` and records the type on the state
     * so the log line can include it.
     */
    switchMode(mode, autoStart = false, isLongBreak = false) {
        let minutes;
        let breakType;
        if (mode === "focus") {
            minutes = this.plugin.settings.focusMinutes;
            breakType = null;
        }
        else if (isLongBreak) {
            minutes = this.plugin.settings.longBreakMinutes;
            breakType = "long";
        }
        else {
            minutes = this.plugin.settings.breakMinutes;
            breakType = "short";
        }
        const total = minutes * ONE_MINUTE_MS;
        this.state = {
            mode,
            isRunning: autoStart,
            remainingMs: total,
            totalMs: total,
            taskName: this.currentTaskName,
            breakType,
        };
        this.emit();
        if (autoStart) {
            this.plugin.logManager.startSession(mode, this.currentTaskName, minutes, this.currentTaskPath, this.currentTaskId, breakType);
            this.targetTime = Date.now() + total;
            this.startLoop();
        }
        else {
            this.targetTime = null;
            this.clearLoop();
        }
    }
    /** Start or resume the timer. Opens a session in LogManager and begins the 50ms tick loop. */
    start() {
        if (this.state.isRunning)
            return;
        // Check if this is a fresh start (not a resume)
        const isFreshStart = this.state.remainingMs === this.state.totalMs;
        this.state.isRunning = true;
        // Start or Resume Logging
        const minutes = this.state.mode === "focus"
            ? this.plugin.settings.focusMinutes
            : this.plugin.settings.breakMinutes;
        this.plugin.logManager.startSession(this.state.mode, this.currentTaskName, minutes, this.currentTaskPath, this.currentTaskId, this.state.breakType);
        // Set target based on current remaining time
        this.targetTime = Date.now() + this.state.remainingMs;
        // Play War Drum only on fresh Focus start
        if (isFreshStart && this.state.mode === "focus") {
            void this.playSound("war-drum_short.mp3");
        }
        this.emit();
        this.startLoop();
    }
    /** Pause the timer without ending the session — pause is logged for accounting. */
    pause() {
        if (!this.state.isRunning)
            return;
        // Log Pause
        this.plugin.logManager.pauseSession();
        this.state.isRunning = false;
        this.targetTime = null;
        this.clearLoop();
        this.emit();
    }
    /**
     * Finish the current session (Stop button): log it as finished and switch to
     * the next mode **paused**. Stop never auto-starts the next session, even when
     * the auto-start toggle is on — that's what Skip / natural completion are for.
     */
    finish() {
        return __awaiter(this, void 0, void 0, function* () {
            // Play specific sounds based on mode when manually finishing
            if (this.state.mode === "focus") {
                void this.playSound("singing_bell_short.mp3");
            }
            else {
                void this.playSound("ding-sound.mp3");
            }
            yield this.handleFinished(false);
        });
    }
    /** Skip the current session; logs focus skips as "cancelled" and rest skips as "finished". */
    skip() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if we are in a "stopped" state (fresh start, not running, not paused)
            const isStopped = !this.state.isRunning && this.state.remainingMs === this.state.totalMs;
            // Play specific sounds based on mode when skipping, unless stopped
            if (!isStopped) {
                if (this.state.mode === "focus") {
                    void this.playSound("singing_bell_short.mp3");
                }
                else {
                    void this.playSound("ding-sound.mp3");
                }
            }
            const status = this.state.mode === "focus" ? "cancelled" : "finished";
            yield this.plugin.logManager.endSession(status);
            yield this.checkTaskCompletionAndUnlink();
            // Skip respects the auto-start toggle: with it on, the next session starts
            // running; with it off, it switches paused (same as Stop).
            const autoStart = this.state.mode === "focus"
                ? this.plugin.settings.autoStartBreak
                : this.plugin.settings.autoStartFocus;
            const nextMode = this.state.mode === "focus" ? "break" : "focus";
            this.switchMode(nextMode, autoStart);
        });
    }
    // Cancel current session without switching modes; not in use currently
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.logManager.endSession("cancelled");
            yield this.checkTaskCompletionAndUnlink();
            this.switchMode(this.state.mode, false);
        });
    }
    reset() {
        const minutes = this.state.mode === "focus"
            ? this.plugin.settings.focusMinutes
            : this.plugin.settings.breakMinutes;
        const total = minutes * ONE_MINUTE_MS;
        this.state.remainingMs = total;
        this.state.totalMs = total;
        if (this.state.isRunning) {
            this.targetTime = Date.now() + total;
        }
        else {
            this.targetTime = null;
            this.clearLoop();
        }
        this.emit();
    }
    /** Adjust total and remaining by `delta` minutes (clamped to a 1-minute minimum total). */
    addMinutes(delta) {
        const deltaMs = delta * ONE_MINUTE_MS;
        // 1. Update the Total Duration
        let newTotal = this.state.totalMs + deltaMs;
        const minTotal = ONE_MINUTE_MS;
        if (newTotal < minTotal)
            newTotal = minTotal;
        // 2. Update Remaining Time with Clamp
        const oldRemaining = this.state.remainingMs;
        let newRemaining = oldRemaining + deltaMs;
        if (newRemaining > newTotal)
            newRemaining = newTotal;
        this.state.totalMs = newTotal;
        this.state.remainingMs = newRemaining;
        // 3. Shift the Wall-Clock Target
        if (this.state.isRunning && this.targetTime !== null) {
            const effectiveChange = newRemaining - oldRemaining;
            this.targetTime += effectiveChange;
        }
        this.emit();
    }
    /** Change a mode's configured duration; takes effect immediately only if that mode is fresh-stopped. */
    updateDuration(mode, minutes) {
        if (this.state.mode === mode) {
            const newTotal = minutes * ONE_MINUTE_MS;
            if (!this.state.isRunning && this.state.remainingMs === this.state.totalMs) {
                this.state.remainingMs = newTotal;
            }
            this.state.totalMs = newTotal;
            this.emit();
        }
    }
}

// Local-timezone YYYY-MM-DD; matches LogManager's daily-log file naming.
const todayLocalStr = () => moment().format("YYYY-MM-DD");
class GentlePomoPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.statusBarEl = null;
        this.statusDot = null;
        this.statusLabel = null;
        this.statusModeEl = null;
        this.statusTimeEl = null;
        this.statusFocusTotal = null;
        this.lastStatusRender = null;
        this.statusFocusBaseSeconds = 0;
        /** Local date (YYYY-MM-DD) the cached base was fetched for; other days count as 0. */
        this.statusFocusBaseDate = null;
        this.statusFocusLastFetchMs = 0;
        this.statusFocusFetchInFlight = false;
        this.statusTimerListener = null;
        this.goalTimerListener = null;
        this.autoOpenObserver = null;
        this.repairInFlight = false;
        /** Set when the remembered music position has moved since the last save. */
        this.musicPositionDirty = false;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.logManager = new LogManager(this);
            this.timer = new TimerEngine(this);
            this.registerEvent(this.app.vault.on("modify", (file) => __awaiter(this, void 0, void 0, function* () {
                yield this.timer.onFileModify(file);
            })));
            this.registerView(VIEW_TYPE_GENTLE_POMO, (leaf) => new GentlePomoView(leaf, this));
            this.addRibbonIcon("clock", "Gentle pomodoro", () => {
                void this.activateView();
            });
            this.addSettingTab(new GentlePomoSettingTab(this.app, this));
            this.addCommand({
                id: "refresh-logs-by-task-id",
                name: "Refresh log task names by ID",
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    yield this.logManager.refreshLoggedTaskNamesById();
                }),
            });
            this.addCommand({
                id: "open-view",
                name: "Open view",
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    yield this.activateView();
                }),
            });
            this.addCommand({
                id: "start",
                name: "Start",
                checkCallback: (checking) => {
                    const state = this.timer.getState();
                    if (checking)
                        return !state.isRunning;
                    this.timer.start();
                    return true;
                },
            });
            this.addCommand({
                id: "pause",
                name: "Pause",
                checkCallback: (checking) => {
                    const state = this.timer.getState();
                    if (checking)
                        return state.isRunning;
                    this.timer.pause();
                    return true;
                },
            });
            this.addCommand({
                id: "finish",
                name: "Finish & next",
                checkCallback: (checking) => {
                    const state = this.timer.getState();
                    const canShow = state.isRunning || state.remainingMs !== state.totalMs;
                    if (checking)
                        return canShow;
                    void this.timer.finish();
                    return true;
                },
            });
            this.addCommand({
                id: "skip",
                name: "Skip to next",
                callback: () => {
                    void this.timer.skip();
                },
            });
            this.addCommand({
                id: "show-status-bar",
                name: "Show status bar",
                checkCallback: (checking) => {
                    if (checking)
                        return !this.settings.showInStatusBar;
                    void this.setStatusBarVisibility(true);
                    return true;
                },
            });
            this.addCommand({
                id: "hide-status-bar",
                name: "Hide status bar",
                checkCallback: (checking) => {
                    if (checking)
                        return this.settings.showInStatusBar;
                    void this.setStatusBarVisibility(false);
                    return true;
                },
            });
            this.addCommand({
                id: "check-task-pomodoro-markers",
                name: "Check for misplaced pomodoro count markers",
                callback: () => {
                    void this.checkPomodoroMarkers();
                },
            });
            this.addCommand({
                id: "repair-task-pomodoro-markers",
                name: "Repair misplaced pomodoro count markers",
                callback: () => {
                    void this.repairPomodoroMarkers();
                },
            });
            this.addCommand({
                id: "remove-task-pomodoro-markers",
                name: "Remove misplaced pomodoro count markers",
                callback: () => {
                    void this.removeMisplacedPomodoroMarkers();
                },
            });
            this.addCommand({
                id: "remove-all-task-pomodoro-markers",
                name: "Remove all pomodoro count markers",
                callback: () => {
                    void this.removeAllPomodoroMarkers();
                },
            });
            // Goal bookkeeping subscribes to the engine directly, independent of the
            // status bar — it must keep working with "Show in status bar" off, where
            // the status-bar listener is unregistered. Emits only kick the guarded
            // refetch; the once-per-day goal notice fires from the refetch landing in
            // maybeRefreshFocusTotal, against logged totals only (see
            // maybeFireGoalNotice for why). onChange invokes the listener immediately,
            // so no extra bootstrap call is needed.
            this.goalTimerListener = () => {
                void this.maybeRefreshFocusTotal();
            };
            this.timer.onChange(this.goalTimerListener);
            // Idle heartbeat: every trigger above is engine-emit-driven, and the engine
            // is silent while idle — so an app left open across local midnight keeps
            // yesterday's total on screen until the first interaction of the new day.
            // The refetch is fully guarded (30s TTL, stale-date bypass), so quiet beats
            // are nearly free; when the date stamp is stale it refetches, and the
            // landing force-renders the status bar and pushes into open views. The
            // window-focus kick corrects a laptop waking from overnight sleep
            // immediately instead of within a minute.
            this.registerInterval(window.setInterval(() => {
                void this.maybeRefreshFocusTotal();
            }, FOCUS_TOTAL_HEARTBEAT_MS));
            this.registerDomEvent(window, "focus", () => {
                void this.maybeRefreshFocusTotal();
            });
            // Safety net for the remembered music position. Every deliberate save is a
            // boundary (pause, stop, track end, panel close, unload); this catches the
            // force-quit/crash case, and writes nothing unless the position moved.
            this.registerInterval(window.setInterval(() => {
                this.flushMusicPosition();
            }, MUSIC_POSITION_SAVE_MS));
            void this.setStatusBarVisibility(this.settings.showInStatusBar, false);
            // Defer auto-open until Obsidian has finished initial layout setup.
            this.app.workspace.onLayoutReady(() => {
                this.maybeAutoOpenView();
            });
        });
    }
    /**
     * Shared runner for the marker-maintenance actions (check / repair /
     * remove): one at a time, failures reported instead of thrown.
     */
    runMarkerMaintenance(label, action) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.repairInFlight)
                return;
            this.repairInFlight = true;
            try {
                yield action();
            }
            catch (e) {
                logger.error(`Failed to ${label} pomodoro markers`, e);
                new obsidian.Notice(`Gentle pomodoro: ${label} failed — see the developer console for details.`);
            }
            finally {
                this.repairInFlight = false;
            }
        });
    }
    /**
     * Dry run for the ≤0.5.0 marker misplacement (issue #2): count affected
     * lines without changing any file, and log the per-file breakdown so the
     * user can inspect before repairing or removing.
     */
    checkPomodoroMarkers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runMarkerMaintenance("check", () => __awaiter(this, void 0, void 0, function* () {
                const result = yield scanMisplacedPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                if (result.linesAffected === 0) {
                    new obsidian.Notice(`Gentle pomodoro: no misplaced 🍅 markers found (${result.filesScanned} file(s) scanned). Nothing to repair.`);
                    return;
                }
                for (const f of result.affected) {
                    logger.warn(`Misplaced 🍅 marker check: ${f.lines} line(s) in "${f.path}"`);
                }
                new obsidian.Notice(`Gentle pomodoro: found ${result.linesAffected} misplaced 🍅 marker(s) in ${result.filesAffected} of ${result.filesScanned} file(s). Nothing was changed — the affected files are listed in the developer console.`);
            }));
        });
    }
    /**
     * One-shot fix for task lines written by ≤0.5.0, whose 🍅 marker landed
     * after the Tasks fields and hid them from the Tasks plugin (issue #2).
     * Rewrites only lines whose marker is in a harmful position, keeping the
     * counts, and reports what it did.
     */
    repairPomodoroMarkers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runMarkerMaintenance("repair", () => __awaiter(this, void 0, void 0, function* () {
                const scan = yield scanMisplacedPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                if (scan.linesAffected === 0) {
                    new obsidian.Notice(`Gentle pomodoro: no misplaced 🍅 markers found (${scan.filesScanned} file(s) scanned).`);
                    return;
                }
                const confirmed = yield confirmAction(this.app, {
                    title: "Repair misplaced pomodoro markers?",
                    body: `Move ${scan.linesAffected} misplaced 🍅 marker(s) in ${scan.filesAffected} file(s) back in front of the Tasks fields? Their counts are kept.`,
                    ctaText: `Repair ${scan.linesAffected} marker(s)`,
                });
                if (!confirmed)
                    return;
                const result = yield repairPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                new obsidian.Notice(`Gentle pomodoro: repaired ${result.linesAffected} task line(s) in ${result.filesAffected} file(s).`);
            }));
        });
    }
    /**
     * Alternative to repair: delete misplaced 🍅 markers, restoring affected
     * lines to their pre-bug form (their lifetime counts are lost). Correctly
     * placed markers are never touched.
     */
    removeMisplacedPomodoroMarkers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runMarkerMaintenance("remove", () => __awaiter(this, void 0, void 0, function* () {
                const scan = yield scanMisplacedPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                if (scan.linesAffected === 0) {
                    new obsidian.Notice(`Gentle pomodoro: no misplaced 🍅 markers found (${scan.filesScanned} file(s) scanned).`);
                    return;
                }
                const confirmed = yield confirmAction(this.app, {
                    title: "Remove misplaced pomodoro markers?",
                    body: `Delete ${scan.linesAffected} misplaced 🍅 marker(s) in ${scan.filesAffected} file(s)? Their lifetime counts will be lost.`,
                    ctaText: `Remove ${scan.linesAffected} marker(s)`,
                    destructive: true,
                });
                if (!confirmed)
                    return;
                const result = yield removeMisplacedPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                new obsidian.Notice(`Gentle pomodoro: removed ${result.linesAffected} misplaced 🍅 marker(s) in ${result.filesAffected} file(s).`);
            }));
        });
    }
    /**
     * The counter's "uninstall": delete every plugin-written 🍅 marker,
     * correctly placed or misplaced. A `🍅 N` the user typed mid-description
     * is never touched (see removeAnyPomodoroMarker).
     */
    removeAllPomodoroMarkers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runMarkerMaintenance("remove", () => __awaiter(this, void 0, void 0, function* () {
                const scan = yield scanAllPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                if (scan.linesAffected === 0) {
                    new obsidian.Notice(`Gentle pomodoro: no 🍅 markers found (${scan.filesScanned} file(s) scanned).`);
                    return;
                }
                const confirmed = yield confirmAction(this.app, {
                    title: "Remove all pomodoro markers?",
                    body: `Delete ${scan.linesAffected} 🍅 marker(s) in ${scan.filesAffected} file(s)? All lifetime counts will be lost and this cannot be undone — consider backing up your vault first.`,
                    ctaText: `Remove ${scan.linesAffected} marker(s)`,
                    destructive: true,
                });
                if (!confirmed)
                    return;
                const result = yield removeAllPomodoroMarkersInVault(this.app, this.settings.tasksPath);
                new obsidian.Notice(`Gentle pomodoro: removed ${result.linesAffected} 🍅 marker(s) in ${result.filesAffected} file(s).`);
            }));
        });
    }
    onunload() {
        // Best effort — saveSettings is async and a hard quit may cut it short,
        // which is what the MUSIC_POSITION_SAVE_MS interval backstops.
        this.flushMusicPosition();
        if (this.autoOpenObserver) {
            this.autoOpenObserver.disconnect();
            this.autoOpenObserver = null;
        }
        if (this.goalTimerListener) {
            this.timer.offChange(this.goalTimerListener);
            this.goalTimerListener = null;
        }
        this.destroyStatusBar();
        // Release the tick loop + shared AudioContext so they don't leak across
        // plugin disable/enable cycles.
        if (this.timer)
            this.timer.dispose();
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_GENTLE_POMO);
            if (leaves.length > 0) {
                leaf = leaves[0];
            }
            else {
                leaf = workspace.getRightLeaf(false);
                yield (leaf === null || leaf === void 0 ? void 0 : leaf.setViewState({ type: VIEW_TYPE_GENTLE_POMO, active: true }));
            }
            if (leaf)
                yield workspace.revealLeaf(leaf);
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const loaded = (yield this.loadData());
            // Migrate legacy "sunset" → "classic" (renamed in 2026-05-26). Saved
            // once so future loads don't repeat the rewrite.
            let migrated = false;
            if (loaded && loaded.theme === "sunset") {
                loaded.theme = "classic";
                migrated = true;
            }
            // First-run/upgrade default for the task-selector toggle: derive it once from
            // the tasks path (hidden when no path is set, shown when a path exists), then
            // persist so the user's explicit choice sticks on later loads.
            const deriveTaskSelector = !loaded || loaded.showTaskSelector === undefined;
            this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded !== null && loaded !== void 0 ? loaded : {});
            if (deriveTaskSelector) {
                this.settings.showTaskSelector = this.settings.tasksPath.trim() !== "";
                migrated = true;
            }
            if (migrated) {
                yield this.saveSettings();
            }
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
    maybeAutoOpenView() {
        if (!this.settings.autoOpenOnStartup)
            return;
        if (!this.isSettingsModalOpen()) {
            void this.activateView();
            return;
        }
        if (this.autoOpenObserver)
            return;
        this.autoOpenObserver = new MutationObserver(() => {
            var _a;
            if (!this.isSettingsModalOpen()) {
                (_a = this.autoOpenObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.autoOpenObserver = null;
                void this.activateView();
            }
        });
        this.autoOpenObserver.observe(activeDocument.body, { childList: true, subtree: true });
    }
    isSettingsModalOpen() {
        return Boolean(activeDocument.querySelector(".modal.mod-settings, .modal-container.mod-settings, .modal.mod-community-plugins, .modal-container.mod-community-plugins"));
    }
    setStatusBarVisibility(show_1) {
        return __awaiter(this, arguments, void 0, function* (show, persist = true) {
            if (persist) {
                this.settings.showInStatusBar = show;
                yield this.saveSettings();
            }
            if (show) {
                this.createStatusBar();
            }
            else {
                this.destroyStatusBar();
            }
        });
    }
    createStatusBar() {
        if (this.statusBarEl)
            return;
        this.statusBarEl = this.addStatusBarItem();
        this.statusBarEl.addClass("gp-status");
        this.statusDot = this.statusBarEl.createDiv("gp-status-dot");
        this.statusLabel = this.statusBarEl.createSpan({ cls: "gp-status-label" });
        this.statusModeEl = this.statusLabel.createSpan({ cls: "gp-status-mode" });
        this.statusTimeEl = this.statusLabel.createSpan({ cls: "gp-status-time" });
        this.statusFocusTotal = this.statusBarEl.createSpan({ cls: "gp-status-focus-total" });
        this.registerDomEvent(this.statusDot, "click", (evt) => {
            evt.preventDefault();
            void this.activateView();
        });
        this.registerDomEvent(this.statusLabel, "click", (evt) => __awaiter(this, void 0, void 0, function* () {
            evt.preventDefault();
            this.settings.showStatusBarTimeLeft = !this.settings.showStatusBarTimeLeft;
            yield this.saveSettings();
            this.updateStatusBar(this.timer.getState(), true);
        }));
        this.statusTimerListener = (state) => {
            this.updateStatusBar(state);
        };
        this.timer.onChange(this.statusTimerListener);
        this.updateStatusBar(this.timer.getState(), true);
    }
    destroyStatusBar() {
        if (this.statusTimerListener) {
            this.timer.offChange(this.statusTimerListener);
            this.statusTimerListener = null;
        }
        if (this.statusBarEl) {
            this.statusBarEl.remove();
        }
        this.statusBarEl = null;
        this.statusDot = null;
        this.statusLabel = null;
        this.statusModeEl = null;
        this.statusTimeEl = null;
        this.statusFocusTotal = null;
    }
    updateStatusBar(state, force = false) {
        if (!this.statusBarEl ||
            !this.statusDot ||
            !this.statusLabel ||
            !this.statusModeEl ||
            !this.statusTimeEl ||
            !this.statusFocusTotal) {
            return;
        }
        const absSeconds = Math.ceil(Math.abs(state.remainingMs) / 1000);
        const modeLabel = state.mode === "focus" ? "Focus" : "Break";
        const timeText = this.formatSeconds(absSeconds, state.remainingMs < 0);
        const showTimeLeft = this.settings.showStatusBarTimeLeft;
        if (!force &&
            this.lastStatusRender &&
            this.lastStatusRender.second === absSeconds &&
            this.lastStatusRender.mode === state.mode &&
            this.lastStatusRender.running === state.isRunning) {
            return;
        }
        this.lastStatusRender = {
            second: absSeconds,
            mode: state.mode,
            running: state.isRunning,
        };
        this.statusDot.toggleClass("gp-mode-focus", state.mode === "focus");
        this.statusDot.toggleClass("gp-mode-break", state.mode === "break");
        this.statusDot.toggleClass("gp-running", state.isRunning);
        this.statusBarEl.toggleClass("gp-show-time", showTimeLeft);
        this.statusModeEl.setText(modeLabel);
        this.statusTimeEl.setText(timeText);
        const { text: totalText, met: goalMet } = this.focusGoalText(state);
        this.statusFocusTotal.setText(totalText);
        this.statusFocusTotal.toggleClass("gp-status-goal-met", goalMet);
        // Mirror the same goal progress into the view (which surfaces it on mobile,
        // where Obsidian hides the status bar). The view also pushes this from its own
        // timer subscription, so this is just a belt-and-suspenders refresh during
        // status-bar updates; the view element is CSS-hidden on desktop.
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_GENTLE_POMO)) {
            if (leaf.view instanceof GentlePomoView) {
                leaf.view.setGoalProgress(totalText, goalMet);
            }
        }
        this.statusBarEl.setAttribute("aria-label", showTimeLeft ? `${modeLabel} ${timeText}` : `${modeLabel} (time hidden)`);
        void this.maybeRefreshFocusTotal();
    }
    /** Focus seconds counted toward today's goal: the date-guarded cached base
     *  (a base fetched on an earlier day counts as 0 until the refetch lands)
     *  plus the live in-progress focus session. */
    currentFocusSeconds(state) {
        const base = effectiveFocusBaseSeconds(this.statusFocusBaseSeconds, this.statusFocusBaseDate, todayLocalStr());
        return base + this.getLiveFocusSeconds(state);
    }
    /** "Today Xh / Yh" focus-time + goal text and whether the goal is met, from the
     *  current focus total. Shared by the status bar and the in-view mobile meter. */
    focusGoalText(state) {
        const focusTotalSeconds = this.currentFocusSeconds(state);
        const goalMinutes = this.settings.dailyFocusGoalMinutes;
        let text = `Today ${this.formatHoursMinutes(focusTotalSeconds)}`;
        let met = false;
        if (goalMinutes > 0) {
            text += ` / ${this.formatHoursMinutes(goalMinutes * 60)}`;
            met = focusTotalSeconds >= goalMinutes * 60;
        }
        return { text, met };
    }
    /** Push the current focus-goal text into a view's in-view meter. Independent of the
     *  status bar, so the goal renders on mobile (where the status bar is hidden) and even
     *  when "Show in status bar" is off. Called by the view on open and on every timer tick. */
    refreshViewGoalProgress(view, state = this.timer.getState()) {
        const { text, met } = this.focusGoalText(state);
        view.setGoalProgress(text, met);
        void this.maybeRefreshFocusTotal();
    }
    /** Ask every open view to duck its lofi music under a sound cue. Called by
     *  TimerEngine.playSound (the engine can't touch the DOM); views without an
     *  active, playing music iframe no-op. */
    duckMusicInOpenViews(cueDurationSec) {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_GENTLE_POMO)) {
            if (leaf.view instanceof GentlePomoView) {
                leaf.view.duckMusic(cueDurationSec);
            }
        }
    }
    /**
     * The remembered music position, or null when the feature is off or nothing
     * is stored. Read once per iframe build — never on the render hot path.
     */
    musicResumeState() {
        if (!this.settings.musicResume || this.settings.lastMusicVideoId === null)
            return null;
        return {
            videoId: this.settings.lastMusicVideoId,
            playlistId: this.settings.lastMusicPlaylistId,
            seconds: this.settings.lastMusicSeconds,
        };
    }
    /**
     * Track where the music has reached. Called from the embed's ~4Hz message
     * stream, so it stays three field writes and a dirty flag — the disk write is
     * deferred to flushMusicPosition (boundaries + the slow interval), because
     * data.json lives in the vault and every save is sync traffic.
     */
    recordMusicPosition(position) {
        if (!this.settings.musicResume)
            return;
        const seconds = Math.floor(position.seconds);
        if (this.settings.lastMusicVideoId === position.videoId &&
            this.settings.lastMusicPlaylistId === position.playlistId &&
            this.settings.lastMusicSeconds === seconds) {
            return; // same whole second — the 4Hz stream collapses to ~1 update/sec
        }
        this.settings.lastMusicVideoId = position.videoId;
        this.settings.lastMusicPlaylistId = position.playlistId;
        this.settings.lastMusicSeconds = seconds;
        this.musicPositionDirty = true;
    }
    /**
     * Forget the position — ⏹ Stop, a finished track, and turning resume off all
     * mean "open this from the top next time". Saved at once rather than on the
     * next boundary: it answers a deliberate action, not a background sample.
     */
    clearMusicPosition() {
        this.musicPositionDirty = false;
        if (this.settings.lastMusicVideoId === null &&
            this.settings.lastMusicPlaylistId === null &&
            this.settings.lastMusicSeconds === 0) {
            return;
        }
        this.settings.lastMusicVideoId = null;
        this.settings.lastMusicPlaylistId = null;
        this.settings.lastMusicSeconds = 0;
        void this.saveSettings();
    }
    /** Persist a moved position. No-op when it hasn't changed since the last save. */
    flushMusicPosition() {
        if (!this.musicPositionDirty)
            return;
        this.musicPositionDirty = false;
        void this.saveSettings();
    }
    /** Fire the once-per-day "goal hit" notice. Fed *logged* seconds only —
     *  deliberately no live in-progress time: the notice lands at the session
     *  boundary alongside the end bell instead of interrupting mid-focus, and
     *  time that never reaches the log (Obsidian quit or plugin disabled
     *  mid-session) can never consume the once-per-day flag. The status bar and
     *  in-view meter still count live seconds — display is reversible, the
     *  notice is not. Called only from maybeRefreshFocusTotal's landing: the
     *  logged total is this check's sole input, and it only changes when a
     *  fetch lands, so that is the one place the crossing can newly become true. */
    maybeFireGoalNotice(loggedSeconds) {
        const today = todayLocalStr();
        if (!shouldFireGoalNotice(loggedSeconds, this.settings.dailyFocusGoalMinutes, this.settings.goalNoticeEnabled, this.settings.lastGoalHitDate, today)) {
            return;
        }
        const goalHm = this.formatHoursMinutes(this.settings.dailyFocusGoalMinutes * 60);
        new obsidian.Notice(`[GentlePomo] Daily focus goal hit: ${goalHm}`);
        this.settings.lastGoalHitDate = today;
        void this.saveSettings();
    }
    getLiveFocusSeconds(state) {
        if (state.mode !== "focus")
            return 0;
        if (!state.isRunning && state.remainingMs === state.totalMs)
            return 0;
        const elapsedMs = state.totalMs - state.remainingMs;
        const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
        return elapsedSeconds;
    }
    /** Drop the focus-total TTL so the next check refetches immediately. Called
     *  by LogManager.writeLog the moment a focus line lands, so the refetch —
     *  and the goal notice riding on its landing — arrives with the
     *  end-of-session bell rather than up to a TTL later. (If a fetch is
     *  already in flight at that instant, its landing re-stamps the TTL and the
     *  fresh line waits for the next beat — worst case ~90s, self-healing.) */
    invalidateFocusTotalCache() {
        this.statusFocusLastFetchMs = 0;
    }
    maybeRefreshFocusTotal() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.statusFocusFetchInFlight)
                return;
            const now = Date.now();
            const today = todayLocalStr();
            // Midnight rollover invalidates the base immediately; the TTL alone would
            // let yesterday's total linger into the new day.
            const baseStale = this.statusFocusBaseDate !== today;
            if (!baseStale && now - this.statusFocusLastFetchMs < FOCUS_TOTAL_CACHE_TTL_MS)
                return;
            this.statusFocusFetchInFlight = true;
            try {
                // `today` is resolved before the read so the stamp matches the day the
                // log file was picked, even if midnight passes during the await.
                const totalSeconds = yield this.logManager.getTodayFocusSeconds();
                this.statusFocusBaseSeconds = totalSeconds;
                this.statusFocusBaseDate = today;
                this.statusFocusLastFetchMs = Date.now();
                // Goal-notice check rides on the landing. Guard: if midnight passed
                // during the await, `totalSeconds` describes yesterday's file — don't
                // feed it to today's check (the now-stale stamp forces a refetch on the
                // next beat, which re-lands with the new day's total).
                if (today === todayLocalStr()) {
                    this.maybeFireGoalNotice(totalSeconds);
                }
                const state = this.timer.getState();
                this.updateStatusBar(state, true);
                // The status-bar path mirrors into open views only while the bar exists;
                // push directly so the in-view meter corrects with the bar hidden too.
                for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_GENTLE_POMO)) {
                    if (leaf.view instanceof GentlePomoView) {
                        this.refreshViewGoalProgress(leaf.view, state);
                    }
                }
            }
            finally {
                this.statusFocusFetchInFlight = false;
            }
        });
    }
    formatSeconds(totalSeconds, overtime = false) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const timeText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        return overtime ? `+${timeText}` : timeText;
    }
    formatHoursMinutes(totalSeconds) {
        const totalMinutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    }
}

module.exports = GentlePomoPlugin;


/* nosourcemap */