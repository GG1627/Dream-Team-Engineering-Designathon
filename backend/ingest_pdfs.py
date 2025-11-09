#!/usr/bin/env python3
"""
Script to ingest PDF documents from the documents directory into the RAG vector store.
This will clear existing data and reload all PDFs.

Usage:
    python ingest_pdfs.py
    python ingest_pdfs.py --dir documents
    python ingest_pdfs.py --no-clear  # Don't clear existing data, just add new
"""

import os
import sys
import argparse
from pathlib import Path

# Add project root directory to path so we can import backend modules
# This script is in backend/, so we need to go up one level to the project root
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.services.agentic_rag import load_pdfs_from_directory, clear_vector_store

def main():
    parser = argparse.ArgumentParser(description='Ingest PDF documents into RAG vector store')
    parser.add_argument('--dir', type=str, default=None, 
                       help='Directory containing PDF files (default: backend/documents)')
    parser.add_argument('--no-clear', action='store_true',
                       help='Do not clear existing data, just add new documents')
    parser.add_argument('--clear-only', action='store_true',
                       help='Only clear the vector store, do not load documents')
    
    args = parser.parse_args()
    
    # Use None to get default path resolution from the function
    documents_dir = args.dir
    if documents_dir:
        documents_dir = os.path.abspath(documents_dir)
    
    if args.clear_only:
        print("Clearing vector store...")
        success = clear_vector_store()
        if success:
            print("✅ Vector store cleared successfully")
        else:
            print("❌ Failed to clear vector store")
            sys.exit(1)
        return
    
    # Load PDFs
    if documents_dir:
        print(f"Loading PDFs from: {documents_dir}")
    else:
        # Will use default path from function
        print("Loading PDFs from: backend/documents (default)")
    clear_existing = not args.no_clear
    
    if clear_existing:
        print("⚠️  This will clear existing data and reload all PDFs")
    
    num_docs = load_pdfs_from_directory(
        documents_dir=documents_dir,
        clear_existing=clear_existing
    )
    
    if num_docs is None:
        print("❌ Error loading PDFs. Check the error messages above.")
        sys.exit(1)
    elif num_docs == 0:
        print("⚠️  No PDF documents found in the directory")
    else:
        print(f"✅ Successfully loaded {num_docs} document(s) into the RAG vector store")

if __name__ == "__main__":
    main()

