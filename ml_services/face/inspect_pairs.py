from sklearn.datasets import fetch_lfw_pairs

lfw_people = fetch_lfw_pairs(subset='test', color=True, resize=1.0)
print(dir(lfw_people))
print("Target shape:", lfw_people.target.shape)
if hasattr(lfw_people, 'pairs'):
    print("Pairs shape:", lfw_people.pairs.shape)
if hasattr(lfw_people, 'filenames'):
    print("Filenames shape:", lfw_people.filenames.shape)
    print("First few filenames:")
    for i in range(3):
        print(f"Pair {i}: {lfw_people.filenames[i]}")
