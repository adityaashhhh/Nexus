import os
from fastapi.testclient import TestClient
from app import app, startup_event

client = TestClient(app)

# Manually trigger startup to load the model
startup_event()

def test_sentiment_service():
    print("\n=======================================================")
    print("             TESTING SPOTTR SENTIMENT SERVICE          ")
    print("=======================================================")

    # 1. Test positive review with quiet and good_wifi aspects
    print("Testing positive review analysis...")
    payload = {
        "text": "This place is amazing! It is extremely quiet and the wifi is super fast. Perfect for writing code."
    }
    response = client.post("/analyze", json=payload)
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    
    print(f"  Full Score: {res_data['sentiment_score']:.4f} ({res_data['label']})")
    assert res_data["sentiment_score"] > 0
    assert res_data["label"] == "Positive"
    
    # Check aspects
    aspects = res_data["aspects"]
    assert aspects["quiet"]["mentioned"] is True
    assert aspects["quiet"]["vote"] == "positive"
    assert aspects["good_wifi"]["mentioned"] is True
    assert aspects["good_wifi"]["vote"] == "positive"
    assert aspects["outdoor_seating"]["mentioned"] is False
    
    print("  Aspects successfully extracted:")
    print("    quiet:    ", aspects["quiet"])
    print("    good_wifi:", aspects["good_wifi"])

    # 2. Test negative review with loud/noisy and no wifi aspects
    print("\nTesting negative review analysis...")
    payload_neg = {
        "text": "Worst experience ever. The music was way too loud and the internet connection was offline. I will not return."
    }
    response = client.post("/analyze", json=payload_neg)
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data_neg = response.json()
    
    print(f"  Full Score: {res_data_neg['sentiment_score']:.4f} ({res_data_neg['label']})")
    assert res_data_neg["sentiment_score"] < 0
    assert res_data_neg["label"] == "Negative"
    
    # Check aspects
    aspects_neg = res_data_neg["aspects"]
    assert aspects_neg["quiet"]["mentioned"] is True
    assert aspects_neg["quiet"]["vote"] == "negative"  # "loud" matches quiet keywords and has negative sentiment
    assert aspects_neg["good_wifi"]["mentioned"] is True
    assert aspects_neg["good_wifi"]["vote"] == "negative" # "connection" matches wifi and has negative sentiment
    
    print("  Aspects successfully extracted:")
    print("    quiet:    ", aspects_neg["quiet"])
    print("    good_wifi:", aspects_neg["good_wifi"])

    print("\n=======================================================")
    print("             ALL SENTIMENT TESTS PASSED!               ")
    print("=======================================================")

if __name__ == "__main__":
    test_sentiment_service()
