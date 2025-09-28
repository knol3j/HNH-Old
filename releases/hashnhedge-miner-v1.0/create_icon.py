"""
Create a simple icon for the HashNHedge Miner
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon():
    # Create a 256x256 image with transparent background
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw a gradient circle background
    center = size // 2
    radius = size // 2 - 20

    # Create gradient effect with multiple circles
    colors = [(99, 102, 241, 255), (118, 75, 162, 200), (240, 147, 251, 150)]
    radii = [radius, radius - 15, radius - 30]

    for color, r in zip(colors, radii):
        draw.ellipse([center - r, center - r, center + r, center + r], fill=color)

    # Add text "HNH"
    try:
        # Try to use a system font
        font = ImageFont.truetype("arial.ttf", 80)
    except:
        try:
            font = ImageFont.truetype("calibri.ttf", 80)
        except:
            # Fallback to default font
            font = ImageFont.load_default()

    # Draw the text
    text = "HNH"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    text_x = (size - text_width) // 2
    text_y = (size - text_height) // 2

    # Draw text with outline
    outline_width = 3
    for adj in range(-outline_width, outline_width + 1):
        for adj2 in range(-outline_width, outline_width + 1):
            draw.text((text_x + adj, text_y + adj2), text, font=font, fill=(0, 0, 0, 255))

    draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255))

    # Save as ICO file
    img.save('logo.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
    print("Icon created: logo.ico")

    # Also save as PNG for web use
    img.save('logo.png', format='PNG')
    print("PNG version created: logo.png")

if __name__ == "__main__":
    create_icon()