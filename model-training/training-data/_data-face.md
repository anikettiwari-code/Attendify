Face Data Storage
This folder stores face images for the recognition system.

Naming Convention
unknown_{timestamp}.jpg - Automatically captured unknown faces
{person_name}.jpg - Labeled face (rename unknown files to this format)
{person_name}_1.jpg, {person_name}_2.jpg - Multiple images of the same person
Instructions
When an unknown face is detected, it gets saved here as unknown_*.jpg
Rename the file to the person's name to label it (e.g., john_doe.jpg)
Press 'r' in the camera window to reload faces after labeling