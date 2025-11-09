"""Quick script to check CUDA availability."""
import torch

print("=" * 50)
print("CUDA Availability Check")
print("=" * 50)

print(f"\nPyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"cuDNN version: {torch.backends.cudnn.version()}")
    print(f"Number of GPUs: {torch.cuda.device_count()}")
    for i in range(torch.cuda.device_count()):
        print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
        print(f"    Memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.2f} GB")
else:
    print("\n⚠ CUDA is NOT available!")
    print("Possible reasons:")
    print("  1. PyTorch was installed without CUDA support")
    print("  2. CUDA drivers are not installed")
    print("  3. GPU is not compatible")
    print("\nTo install PyTorch with CUDA support:")
    print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")

print("=" * 50)

