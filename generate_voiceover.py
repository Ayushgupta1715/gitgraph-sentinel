import asyncio
import edge_tts
import os

SCRIPT_TEXT = (
    "Welcome to GitGraph Sentinel, built for the FalkorDB Hackathon Track 01: Agents That Act on Connected Data. "
    "Modern applications are complex interconnected graphs. When security flaws occur, traditional vector search fails because vulnerabilities are multi-hop relationship problems. "
    "GitGraph Sentinel parses codebases into an AST-backed graph stored directly in FalkorDB. "
    "By executing multi-hop Cypher queries, our autonomous agent uncovers hidden attack paths. "
    "Here, it detects an unauthenticated route handler reaching a sensitive financial ledger across two hops. "
    "With a single click, Show Attack Path isolates the exact vulnerability in glowing crimson. "
    "The agent extracts verified source-code evidence with exact line numbers. "
    "In Safe Fix Preview, developers review the patch before the agent autonomously injects the fix, immediately re-evaluating the graph to prove the vulnerability is closed. "
    "Finally, our Blast Radius engine analyzes reverse dependencies to protect downstream APIs. "
    "GitGraph Sentinel: Autonomous graph-powered security with FalkorDB."
)

async def generate_narration():
    voice = "en-US-ChristopherNeural"
    output_audio = "narration.mp3"
    communicate = edge_tts.Communicate(SCRIPT_TEXT, voice, rate="+6%")
    await communicate.save(output_audio)
    print(f"[Audio] Voiceover generated: {output_audio}")

if __name__ == "__main__":
    asyncio.run(generate_narration())
