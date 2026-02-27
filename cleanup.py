import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Clean up accidental replications
    content = re.sub(r'dark:text-gray-500\s*dark:text-gray-400', 'dark:text-gray-400', content)
    content = re.sub(r'text-gray-500\s*dark:text-gray-500\s*dark:text-gray-400', 'text-gray-500 dark:text-gray-400', content)
    
    # Let's just fix any occurrences of multiple 'dark:text-gray-500' 
    content = re.sub(r'(dark:text-gray-500\s*){2,}', 'dark:text-gray-500 ', content)
    content = re.sub(r'text-gray-500\s+dark:text-gray-500\s+dark:text-gray-400', 'text-gray-500 dark:text-gray-400', content)
    content = re.sub(r'text-gray-500\s*dark:text-gray-500\s*dark:text-gray-500\s*dark:text-gray-400', 'text-gray-500 dark:text-gray-400', content)

    # Let's fix cases like text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400
    while True:
        new_content = re.sub(r'(text-gray-\d+)\s+(dark:text-gray-\d+\s+)+dark:text-gray-\d+', r'\1 dark:text-gray-400', content)
        if new_content == content:
            break
        content = new_content

    # Another fix to be sure:
    content = re.sub(r'(dark:text-[a-z0-9-]+\s+)+dark:text-[a-z0-9-]+', lambda m: m.group(0).split()[-1], content)

    # Re-apply any missing fixes correctly
    # If there is just text-gray-400, replace with text-gray-500 dark:text-gray-400
    # But ONLY if not preceded by dark: or hover:
    # Actually, using lookbehind:
    content = re.sub(r'(?<![a-zA-Z:-])text-gray-[34]00(?!\s+dark:)', 'text-gray-500 dark:text-gray-400', content)


    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Cleaned {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
