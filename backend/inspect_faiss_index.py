#!/usr/bin/env python3
"""
Script to inspect the contents of the FAISS index.
This will show you what documents are stored in the vector database.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.services.agentic_rag import FAISS_INDEX_PATH, embeddings
from langchain_community.vectorstores import FAISS

def inspect_faiss_index():
    """Inspect the FAISS index and display its contents."""
    
    print(f"\n{'='*60}")
    print(f"FAISS Index Inspector")
    print(f"{'='*60}\n")
    print(f"Index path: {FAISS_INDEX_PATH}")
    print(f"Index exists: {os.path.exists(FAISS_INDEX_PATH)}")
    print(f"Is directory: {os.path.isdir(FAISS_INDEX_PATH) if os.path.exists(FAISS_INDEX_PATH) else False}\n")
    
    if not os.path.exists(FAISS_INDEX_PATH):
        print("❌ FAISS index directory does not exist!")
        return
    
    try:
        # Load the FAISS index
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH,
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        print("✅ Successfully loaded FAISS index\n")
        
        # Get all documents from the index
        if hasattr(vector_store, 'docstore'):
            docstore = vector_store.docstore
            if hasattr(docstore, '_dict'):
                docs = docstore._dict
                num_docs = len(docs)
                
                print(f"{'='*60}")
                print(f"Index Statistics:")
                print(f"{'='*60}")
                print(f"Total documents in index: {num_docs}\n")
                
                if num_docs == 0:
                    print("⚠️  WARNING: Index is empty!")
                elif num_docs == 1:
                    # Check if it's just the placeholder
                    first_doc = list(docs.values())[0]
                    if hasattr(first_doc, 'page_content') and first_doc.page_content == "_placeholder_":
                        print("⚠️  WARNING: Index only contains placeholder!")
                        print("   You need to run the ingestion script to add documents.")
                
                # Display document contents
                print(f"\n{'='*60}")
                print(f"Document Contents:")
                print(f"{'='*60}\n")
                
                for i, (doc_id, doc) in enumerate(docs.items(), 1):
                    print(f"Document {i} (ID: {doc_id}):")
                    print(f"{'-'*60}")
                    
                    if hasattr(doc, 'page_content'):
                        content = doc.page_content
                        # Truncate long content for display
                        if len(content) > 500:
                            print(f"Content (first 500 chars):\n{content[:500]}...")
                        else:
                            print(f"Content:\n{content}")
                    
                    if hasattr(doc, 'metadata'):
                        metadata = doc.metadata
                        if metadata:
                            print(f"\nMetadata: {metadata}")
                    
                    print()
                
                # Test retrieval with a sample query
                print(f"{'='*60}")
                print(f"Testing Retrieval:")
                print(f"{'='*60}\n")
                
                test_queries = ["what is my name?", "name", "Gael", "Gael Garcia", "who am I"]
                retriever = vector_store.as_retriever(search_kwargs={"k": 8})
                
                for query in test_queries:
                    print(f"Query: '{query}'")
                    try:
                        results = retriever.invoke(query)
                        print(f"  Retrieved {len(results)} document(s)")
                        for j, result in enumerate(results, 1):
                            content_preview = result.page_content[:100].replace('\n', ' ')
                            print(f"  {j}. {content_preview}...")
                    except Exception as e:
                        print(f"  Error: {e}")
                    print()
        
        else:
            print("❌ Could not access document store")
            
    except Exception as e:
        print(f"❌ Error loading FAISS index: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    inspect_faiss_index()
