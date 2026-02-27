import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # 1. Replace text-gray-300 dark:text-gray-600 with text-gray-500 dark:text-gray-400
    content = content.replace("text-gray-300 dark:text-gray-600", "text-gray-500 dark:text-gray-400")

    # 2. Replace text-gray-400 dark:text-gray-500 with text-gray-500 dark:text-gray-400
    content = content.replace("text-gray-400 dark:text-gray-500", "text-gray-500 dark:text-gray-400")

    # 3. Handle standalone text-gray-400 when not followed by dark:text-gray...
    # We will use regex to find text-gray-400 that isn't part of the above pair
    content = re.sub(r'\btext-gray-400\b(?! dark:)', 'text-gray-500 dark:text-gray-400', content)

    # 4. Handle standalone text-gray-300
    content = re.sub(r'\btext-gray-300\b(?! dark:)', 'text-gray-500 dark:text-gray-400', content)

    # Also handle some text-white instances that are naked but we are not sure yet. 
    # The main issue is light-gray colors not being visible in light mode.
    # What about widget backgrounds that are too light? 
    # Wait! the user also complained about "text-white" in SOME places...
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
