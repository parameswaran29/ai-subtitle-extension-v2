package com.example.aisubtitle;

import java.util.List;

public class TranslationResponse {
    private String tamil;
    private String simpleEnglish;
    private List<WordMeaning> difficultWords;

    public TranslationResponse() {}

    public TranslationResponse(String tamil, String simpleEnglish, List<WordMeaning> difficultWords) {
        this.tamil = tamil;
        this.simpleEnglish = simpleEnglish;
        this.difficultWords = difficultWords;
    }

    public String getTamil() { return tamil; }
    public void setTamil(String tamil) { this.tamil = tamil; }
    public String getSimpleEnglish() { return simpleEnglish; }
    public void setSimpleEnglish(String simpleEnglish) { this.simpleEnglish = simpleEnglish; }
    public List<WordMeaning> getDifficultWords() { return difficultWords; }
    public void setDifficultWords(List<WordMeaning> difficultWords) { this.difficultWords = difficultWords; }
}
