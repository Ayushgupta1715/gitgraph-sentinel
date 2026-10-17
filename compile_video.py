import subprocess
import os

def build_demo_video():
    # 6 Scenes timed to match narration.mp3 (Total: 68.68s)
    # Scene 1: Introduction & Architecture (14s)
    # Scene 2: Multi-Hop Attack Path Isolated (12s)
    # Scene 3: Verified AST Code Evidence (11s)
    # Scene 4: Safe Fix Preview Side-by-Side Diff (11s)
    # Scene 5: Autonomous Patch Ingestion & Verified Secure Graph (9s)
    # Scene 6: Visual Blast Radius Engine & Conclusion (11.68s)
    
    concat_script = """ffconcat version 1.0
file video_assets/scene1_overview.png
duration 14.0
file video_assets/scene2_attack_path.png
duration 12.0
file video_assets/scene3_evidence.png
duration 11.0
file video_assets/scene4_safe_fix.png
duration 11.0
file video_assets/scene5_verified.png
duration 9.0
file video_assets/scene6_blast_radius.png
duration 11.68
file video_assets/scene6_blast_radius.png
"""

    with open("concat_list.txt", "w", encoding="utf-8") as f:
        f.write(concat_script)

    output_video = "gitgraph_sentinel_demo.mp4"
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "concat_list.txt",
        "-i", "narration.mp3",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_video
    ]

    print("[FFmpeg] Compiling 1080p MP4 demo video with studio narration...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"[FFmpeg] SUCCESS! Video generated: {output_video} ({os.path.getsize(output_video)} bytes)")
    else:
        print(f"[FFmpeg Error]: {res.stderr}")

if __name__ == "__main__":
    build_demo_video()
