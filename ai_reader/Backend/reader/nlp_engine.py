import spacy
from transformers import pipeline
import re

# Load spaCy for sentence splitting
nlp = spacy.load("en_core_web_sm")

# Pipelines
t5_simplifier = pipeline("text2text-generation", model="google/flan-t5-large")
bart_simplifier = pipeline("summarization", model="facebook/bart-large-cnn")

# Expanded dictionary
complex_words = {
    "utilization": "use",
    "utilize": "use",
    "advanced": "hard", 
    "methodologies": "methods",
    "facilitates": "helps",
    "comprehension": "understanding",
    "approximately": "about",
    "demonstrate": "show",
    "individuals": "people",
    "assistance": "help",
    "numerous": "many",
    "purchase": "buy",
    "terminate": "end",
    "commence": "start",
    "analyze": "examine",
    "synthesize": "combine",
    "evaluate": "assess",
    "illustrate": "show",
    "significant": "important",
    "concept": "idea",
    "objective": "goal",
    "subjective": "personal",
    "interpret": "explain",
    "derive": "get",
    "implement": "apply",
    "conclude": "decide",
    "justify": "explain clearly",
    "calculate": "work out",
    "approximate": "estimate",
    "fundamental": "basic",
    "consequence": "result",
    "advantage": "benefit",
    "disadvantage": "drawback",
    "hypothesis": "guess",
    "phenomenon": "event",
    "strategy": "plan",
    "criteria": "rules",
    "valid": "true",
    "invalid": "false",
    "judge": "decide",
    "several": "many"
}

# 🔹 Step 1: Replace complex words
def simplify_words(text):
    words = re.findall(r'\w+|\S', text)
    new_words = []

    for word in words:
        clean_word = word.lower()
        if clean_word in complex_words:
            new_words.append(complex_words[clean_word])
        else:
            new_words.append(word)

    return " ".join(new_words)


# 🔹 Step 2: Main AI simplification
def simplify_text(text, level="easy"):
    doc = nlp(text)
    simplified_output = []

    for sent in doc.sents:
        # Dictionary simplification
        sentence = simplify_words(sent.text)

        # --- EASY MODE ---
        if level == "easy":
            prompt = "Simplify this sentence clearly and do not repeat ideas: " + sentence
            result = t5_simplifier(prompt, max_length=60, num_beams=3)
            simplified_text = result[0]['generated_text'].strip()

        # --- MEDIUM MODE ---
        elif level == "medium":
            result = bart_simplifier(sentence, max_length=40, min_length=8, do_sample=False)
            simplified_text = result[0]['summary_text'].strip()

        # --- HARD MODE ---
        else:
            simplified_text = sentence

        # ✅ FIX: Keep only first sentence to avoid repetition
        cleaned = simplified_text.split(".")[0].strip()

        if cleaned:
            cleaned_sentence = cleaned + "."
            
            if all(cleaned_sentence.lower() not in s.lower() for s in simplified_output):
                simplified_output.append(cleaned_sentence)

    # 🔹 Combine sentences cleanly
    final_text = " ".join(simplified_output)

    # 🔹 Fix spacing
    final_text = final_text.replace(" .", ".").replace(" ,", ",").replace(" !", "!").replace(" ?", "?")

    return final_text