import base64
import os

img = b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
os.makedirs('assets/images', exist_ok=True)
files = ['icon.png', 'favicon.png', 'splash.png', 'adaptive-icon.png']
for f in files:
    with open(f'assets/images/{f}', 'wb') as file:
        file.write(base64.b64decode(img))
