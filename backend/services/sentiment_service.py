import re
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

sentiment_analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(texts: list[str]) -> dict:
    # Strip non-ASCII so VADER scores English content only
    combined = ' '.join(re.sub(r'[^\x00-\x7F]+', ' ', t) for t in texts)
    scores   = sentiment_analyzer.polarity_scores(combined)
    total    = scores['pos'] + scores['neg'] + scores['neu'] or 1
    return {
        "positive": round((scores['pos'] / total) * 100, 2),
        "negative": round((scores['neg'] / total) * 100, 2),
        "neutral":  round((scores['neu'] / total) * 100, 2),
        "compound": round(scores['compound'], 4)
    }
