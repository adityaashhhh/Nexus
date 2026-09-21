import urllib.request

url = "http://www.cs.columbia.edu/CAVE/databases/pubfig/download/lfw_attributes.txt"
print(f"Downloading from {url}...")
try:
    with urllib.request.urlopen(url) as response:
        head = [response.readline().decode('utf-8') for _ in range(5)]
    print("Download successful! First 5 lines:")
    for line in head:
        print(line.strip())
except Exception as e:
    print(f"Error downloading: {e}")
