import time
from sklearn.datasets import fetch_lfw_pairs

print("Fetching LFW test pairs...")
start = time.time()
try:
    lfw_people = fetch_lfw_pairs(subset='test', color=True, resize=1.0)
    print(f"Successfully fetched LFW test pairs in {time.time() - start:.2f} seconds!")
    print(f"Number of pairs: {len(lfw_people.pairs)}")
    print(f"Shape of pairs array: {lfw_people.pairs.shape}")
    print(f"Target classes: {lfw_people.target_names}")
except Exception as e:
    print(f"Error fetching LFW pairs: {e}")
