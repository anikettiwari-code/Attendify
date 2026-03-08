"""
Batch Image Rename Script for Face Data
Renames all unknown_*.jpg files or specific images to a given person's name.

Naming Convention (from _data-face.md):
- unknown_{timestamp}.jpg - Automatically captured unknown faces
- {person_name}.jpg - Labeled face (rename unknown files to this format)
- {person_name}_1.jpg, {person_name}_2.jpg - Multiple images of the same person

Usage:
    python rename_images.py <person_name> [--all] [--file <filename>]
    
Examples:
    python rename_images.py john_doe --all           # Rename all unknown_*.jpg to john_doe.jpg, john_doe_1.jpg, etc.
    python rename_images.py john --file unknown_123.jpg  # Rename specific file to john.jpg
    python rename_images.py --list               # List all images in the folder

Note: Use underscores for multi-word names (e.g., john_doe, not "john doe")
"""

import os
import sys
import argparse
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent


def list_images():
    """List all images in the data folder with their details."""
    print("\n" + "=" * 60)
    print("Images in _data-face folder:")
    print("=" * 60)
    
    known = []
    unknown = []
    
    for img in SCRIPT_DIR.iterdir():
        if img.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            size_kb = img.stat().st_size / 1024
            if img.stem.startswith('unknown_'):
                unknown.append((img.name, size_kb))
            else:
                known.append((img.name, size_kb))
    
    if known:
        print("\n[*] KNOWN FACES (will be used for recognition):")
        for name, size in sorted(known):
            print(f"   [OK] {name} ({size:.1f} KB)")
    
    if unknown:
        print(f"\n[?] UNKNOWN FACES ({len(unknown)} files - need renaming):")
        for name, size in sorted(unknown):
            print(f"   - {name} ({size:.1f} KB)")
    
    if not known and not unknown:
        print("   No images found.")
    
    print("\n" + "-" * 60)
    print("Naming Convention:")
    print("  {person_name}.jpg       - First image of a person")
    print("  {person_name}_1.jpg     - Additional images")
    print("  Use underscores for names: john_doe, not 'john doe'")
    print("-" * 60)
    print("\nTo rename images:")
    print("  python rename_images.py <person_name> --all")
    print("  python rename_images.py <person_name> --file <filename>")
    print("-" * 60 + "\n")
    
    return len(known) + len(unknown)


def sanitize_name(name: str) -> str:
    """
    Sanitize person name for use as filename.
    - Converts to lowercase
    - Replaces spaces with underscores
    - Removes invalid filename characters
    """
    name = name.lower().strip()
    # Replace spaces with underscores
    name = name.replace(' ', '_')
    # Remove any characters that aren't alphanumeric or underscore
    name = ''.join(c for c in name if c.isalnum() or c == '_')
    # Remove multiple consecutive underscores
    while '__' in name:
        name = name.replace('__', '_')
    # Remove leading/trailing underscores
    name = name.strip('_')
    return name


def rename_file(old_name: str, new_name: str) -> bool:
    """Rename a single file."""
    old_path = SCRIPT_DIR / old_name
    new_path = SCRIPT_DIR / new_name
    
    if not old_path.exists():
        print(f"[ERROR] File not found: {old_name}")
        return False
    
    if new_path.exists():
        print(f"[ERROR] Target file already exists: {new_name}")
        return False
    
    old_path.rename(new_path)
    print(f"[OK] Renamed: {old_name} -> {new_name}")
    return True


def get_next_index(person_name: str) -> int:
    """Get the next available index for a person's images."""
    existing = []
    for f in SCRIPT_DIR.iterdir():
        if f.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            stem = f.stem.lower()
            if stem == person_name:
                existing.append(0)  # Base name without number
            elif stem.startswith(f"{person_name}_"):
                try:
                    num = int(stem.replace(f"{person_name}_", ""))
                    existing.append(num)
                except ValueError:
                    pass  # Not a numbered file
    
    if not existing:
        return 0  # No existing files, start with base name
    return max(existing) + 1


def rename_all_unknown(person_name: str) -> int:
    """Rename all unknown_*.jpg files to person_name format."""
    person_name = sanitize_name(person_name)
    if not person_name:
        print("[ERROR] Person name cannot be empty")
        return 0
    
    # Get all unknown files
    unknown_files = sorted([
        f for f in SCRIPT_DIR.iterdir()
        if f.suffix.lower() in ['.jpg', '.jpeg', '.png'] and f.stem.startswith('unknown_')
    ])
    
    if not unknown_files:
        print("[INFO] No unknown_*.jpg files to rename")
        return 0
    
    print(f"\n[INFO] Found {len(unknown_files)} unknown file(s) to rename as '{person_name}'")
    
    # Get starting index
    start_index = get_next_index(person_name)
    
    renamed_count = 0
    for i, old_file in enumerate(unknown_files):
        ext = old_file.suffix.lower()
        
        index = start_index + i
        if index == 0:
            # First file gets just the name
            new_name = f"{person_name}{ext}"
        else:
            # Subsequent files get numbered
            new_name = f"{person_name}_{index}{ext}"
        
        if rename_file(old_file.name, new_name):
            renamed_count += 1
    
    print(f"\n[SUCCESS] Renamed {renamed_count} file(s)")
    print("[TIP] Press 'r' in the face detection window to reload faces")
    return renamed_count


def rename_specific_file(old_filename: str, person_name: str) -> bool:
    """Rename a specific file to person_name.jpg"""
    person_name = sanitize_name(person_name)
    if not person_name:
        print("[ERROR] Person name cannot be empty")
        return False
    
    old_path = SCRIPT_DIR / old_filename
    if not old_path.exists():
        print(f"[ERROR] File not found: {old_filename}")
        return False
    
    ext = old_path.suffix.lower()
    
    # Get next available index
    index = get_next_index(person_name)
    
    if index == 0:
        new_name = f"{person_name}{ext}"
    else:
        new_name = f"{person_name}_{index}{ext}"
    
    success = rename_file(old_filename, new_name)
    if success:
        print("[TIP] Press 'r' in the face detection window to reload faces")
    return success


def main():
    parser = argparse.ArgumentParser(
        description="Batch rename images for face recognition",
        epilog="""
Examples:
  python rename_images.py john_doe --all     Rename all unknown images to john_doe
  python rename_images.py ash -f unknown_123.jpg   Rename specific file
  python rename_images.py --list             Show all images
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('name', nargs='?', help="Person's name (use underscores for spaces, e.g., john_doe)")
    parser.add_argument('--all', '-a', action='store_true', 
                        help="Rename all unknown_*.jpg files")
    parser.add_argument('--file', '-f', type=str, 
                        help="Rename a specific file")
    parser.add_argument('--list', '-l', action='store_true',
                        help="List all images in the folder")
    
    args = parser.parse_args()
    
    # Default to listing if no arguments
    if len(sys.argv) == 1 or args.list:
        list_images()
        return
    
    if not args.name:
        print("[ERROR] Please provide a person's name")
        print("Usage: python rename_images.py <name> --all")
        print("       Use underscores for multi-word names: john_doe")
        return
    
    if args.all:
        rename_all_unknown(args.name)
    elif args.file:
        rename_specific_file(args.file, args.name)
    else:
        # Default behavior: rename all unknown
        rename_all_unknown(args.name)


if __name__ == "__main__":
    main()
