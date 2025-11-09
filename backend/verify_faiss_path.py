#!/usr/bin/env python3
"""
Quick script to verify the FAISS index path is correct.
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.services.agentic_rag import FAISS_INDEX_PATH

print("=" * 60)
print("FAISS Index Path Verification")
print("=" * 60)
print(f"FAISS_INDEX_PATH: {FAISS_INDEX_PATH}")
print(f"Absolute path: {os.path.abspath(FAISS_INDEX_PATH)}")
print(f"Exists: {os.path.exists(FAISS_INDEX_PATH)}")
print(f"Is directory: {os.path.isdir(FAISS_INDEX_PATH) if os.path.exists(FAISS_INDEX_PATH) else False}")
print()

# Check if it's in backend/
if "backend" in FAISS_INDEX_PATH:
    print("✅ Path is in backend/ directory (correct)")
else:
    print("⚠️  Path is NOT in backend/ directory (may be incorrect)")

print("=" * 60)

