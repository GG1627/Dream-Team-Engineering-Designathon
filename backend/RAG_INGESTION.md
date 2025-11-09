# RAG Document Ingestion Guide

This guide explains how to load PDF documents into the RAG (Retrieval-Augmented Generation) system.

## Overview

The RAG system stores documents in a FAISS vector store. When you add or update documents, you need to rebuild the index.

## How It Works

1. **Documents are stored in**: `backend/documents/` directory
2. **Vector store is saved to**: `backend/faiss_index/` directory
3. **When you update documents**: You need to rebuild the index to clear old data and load new data

## Methods to Ingest Documents

### Method 1: Using the Python Script (Recommended)

Run the ingestion script from the `backend` directory:

```bash
# From the backend directory
python ingest_pdfs.py
```

This will:
- Clear existing data
- Load all PDFs from `backend/documents/`
- Split them into chunks
- Save to the vector store

**Options:**
```bash
# Use a custom directory
python ingest_pdfs.py --dir /path/to/documents

# Don't clear existing data, just add new documents
python ingest_pdfs.py --no-clear

# Only clear the vector store (don't load documents)
python ingest_pdfs.py --clear-only
```

### Method 2: Using the API Endpoint

If your backend server is running, you can call the API:

```bash
# Rebuild from PDFs (clears existing and loads new)
curl -X POST http://localhost:8000/rag/rebuild-from-pdfs

# Clear the vector store
curl -X POST http://localhost:8000/rag/clear
```

### Method 3: Using Python Code

```python
from backend.services.agentic_rag import load_pdfs_from_directory, clear_vector_store

# Clear and reload all PDFs
num_docs = load_pdfs_from_directory(documents_dir=None, clear_existing=True)
print(f"Loaded {num_docs} documents")

# Or just clear
clear_vector_store()
```

## First-Person Questions

The RAG system now supports first-person questions! You can ask questions using "I", "my", "me", etc., and Katie will understand you're asking about your own medical information.

**Examples:**
- "What medications do I take?"
- "What are my allergies?"
- "When was my last visit?"
- "What did my doctor say about my asthma?"

The system prompt has been updated to handle first-person queries naturally.

## Important Notes

1. **Clearing Old Data**: When you rebuild the index, it automatically clears old data. This is the recommended approach to avoid duplicates.

2. **Document Format**: The system works best with PDF documents. Place all PDFs in the `backend/documents/` directory.

3. **First-Person Documents**: If your documents are written in first person (using "I", "my", etc.), the system will work better with first-person questions.

4. **After Ingestion**: After loading documents, the changes are immediately available. You don't need to restart the server (unless you're using the script method, in which case the server should reload automatically if using `--reload`).

## Troubleshooting

**Issue: "Documents directory not found"**
- Make sure the `backend/documents/` directory exists
- Check that you're running the script from the correct directory

**Issue: "No documents found"**
- Ensure there are PDF files in the `backend/documents/` directory
- Check file permissions

**Issue: Old data still showing**
- Make sure you're using `clear_existing=True` (default)
- Check that the vector store was properly cleared in the logs

## Example Workflow

1. Place your PDF document in `backend/documents/Testing_RAG_Document.pdf`
2. Run: `python ingest_pdfs.py`
3. The system will clear old data and load the new PDF
4. Ask questions in the chat: "What medications do I take?"

