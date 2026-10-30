# Video review preferences

- The user previews videos in Chrome from their Mac checkout at `/Users/mac/.gemini/antigravity/scratch/my-ai-project/index.html`.
- When delivering a video revision, include safe local sync commands followed by the plain `file:///Users/mac/.gemini/antigravity/scratch/my-ai-project/index.html` URL. A cloud/GitHub update does not update their Mac automatically.
- Use the existing `video/bring-the-star-home` branch. Preserve local changes; never recommend force-reset, clean, or overwriting files to make sync pass. If `git switch` or a fast-forward pull fails, report the error and preserve local work.
- Keep character/environment scale harmonious. Retain intentional shot variety; correct individual oversized shots rather than shrinking the heroine indiscriminately in all scenes.
- Latest clarification: use the SECOND edition's `video/storyboard.png` as the canonical composition and character scale in ALL six shots. Refine face/hair at the existing scale; do not turn wide shots into character portraits to showcase the redesign. Far-shot facial detail may naturally remain subtle.
- The user supplied `sb_reverie.mp3`; its metadata identifies `Reverie`, Scott Buckley, and the artist's music-library URL. Edition 6 combines a 42-second excerpt with scene effects, retaining edition 5's video stream. The full user-supplied MP3 is retained outside the public checkout, not redistributed as a separate track. Author/title are credited in the player and video metadata. The specific official licensing page remains inaccessible from this environment; do not claim it was independently verified. Editions 3–5 are sound-effects-only previews.
- Edition 7 is a 34-second release edit: start on the star discovery, then street/alley/tram/window/home, with less explanatory text and a lingering ending. Keep the 42-second edition 6 for comparison. Audience-retention edits must preserve the quiet healing mood, original scale, watercolor aesthetic and Reverie; no loud impact effects or oversized character framing.
- The user ultimately selected edition 6, the 42-second Reverie version. Keep it as the player's default and delivery master; edition 7 remains an optional comparison, not the selected final.

# 3D cottage direction

- The user now prioritizes the reference's natural, detailed cottage/vegetation/long-haired white-dress character quality over browser delivery convenience. Do not silently substitute a low-poly final look or claim a technical prototype reaches the reference quality.
- `cottage-world` is a Blender/Godot technical study, not final approved art. It has first-person movement and editing/persistence/door collision checks; it does not yet contain the final third-person character. No GPU image-quality or Mac performance claim has been verified.
- Poly Haven and ambientCG are blocked by the cloud network policy. A standard-library downloader can use the user's Mac Clash HTTP proxy at 127.0.0.1:7900; do not disable TLS/checksum verification. Be explicit about downloaded versus pending assets.
