# Face Data Storage

This folder stores face images for the recognition system.

## Naming Convention

- `unknown_{timestamp}.jpg` - Automatically captured unknown faces
- `{person_name}.jpg` - Labeled face (rename unknown files to this format)
- `{person_name}_1.jpg`, `{person_name}_2.jpg` - Multiple images of the same person

## Instructions

1. When an unknown face is detected, it gets saved here as `unknown_*.jpg`
2. Rename the file to the person's name to label it (e.g., `john_doe.jpg`)
3. Press 'r' in the camera window to reload faces after labeling
