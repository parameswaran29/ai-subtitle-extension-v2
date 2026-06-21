package com.example.aisubtitle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class TranslateService {

    // Your provided API Key
    private static final String API_KEY = "AQ.Ab8RN6JMb5xeIrTjT1AZOxtbwanmL1l8vSLRRlsCFkVXreE2IQ";
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public TranslateService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public TranslationResponse translate(TranslationRequest request) {
        String subtitle = request.getSubtitle();
        String imageBase64 = request.getImageBase64();

        if ((subtitle == null || subtitle.trim().isEmpty()) && (imageBase64 == null || imageBase64.trim().isEmpty())) {
            return new TranslationResponse("N/A", "N/A", new ArrayList<>());
        }

        try {
            // 1. Build the highly-specific Prompt
            String prompt = "Translate this subtitle into Tamil. Convert it to simple English. Explain difficult words. " +
                    "Return ONLY a raw JSON object without any markdown formatting. " +
                    "The JSON must exactly match this structure:\n" +
                    "{\n" +
                    "  \"tamil\": \"Tamil translation here\",\n" +
                    "  \"simpleEnglish\": \"Simple English here\",\n" +
                    "  \"difficultWords\": [\n" +
                    "    { \"word\": \"word\", \"meaning\": \"meaning\" }\n" +
                    "  ]\n" +
                    "}";

            if (subtitle != null && !subtitle.trim().isEmpty()) {
                prompt += "\n\nSubtitle: \"" + subtitle + "\"";
            } else if (imageBase64 != null) {
                prompt += "\n\nRead the English subtitle text from the bottom of this image, and translate that text.";
            }

            // 2. Build the Gemini Request JSON
            String requestBody;
            if (imageBase64 != null && !imageBase64.isEmpty()) {
                // Strip the data URL prefix if present
                if (imageBase64.startsWith("data:image")) {
                    imageBase64 = imageBase64.substring(imageBase64.indexOf(",") + 1);
                }
                requestBody = "{\n" +
                        "  \"contents\": [{\n" +
                        "    \"parts\": [\n" +
                        "      {\"text\": " + objectMapper.writeValueAsString(prompt) + "},\n" +
                        "      {\"inline_data\": {\"mime_type\": \"image/jpeg\", \"data\": \"" + imageBase64 + "\"}}\n" +
                        "    ]\n" +
                        "  }]\n" +
                        "}";
            } else {
                requestBody = "{\n" +
                        "  \"contents\": [{\n" +
                        "    \"parts\": [{\"text\": " + objectMapper.writeValueAsString(prompt) + "}]\n" +
                        "  }]\n" +
                        "}";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            // 3. Make HTTP POST call to Google Gemini
            String rawResponse = restTemplate.postForObject(GEMINI_API_URL, entity, String.class);

            // 4. Parse the deeply nested response from Gemini
            JsonNode rootNode = objectMapper.readTree(rawResponse);
            String aiJsonResponse = rootNode
                    .path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();

            // Clean up markdown code blocks if the AI includes them
            aiJsonResponse = aiJsonResponse.trim();
            if (aiJsonResponse.startsWith("```json")) {
                aiJsonResponse = aiJsonResponse.substring(7);
            } else if (aiJsonResponse.startsWith("```")) {
                aiJsonResponse = aiJsonResponse.substring(3);
            }
            if (aiJsonResponse.endsWith("```")) {
                aiJsonResponse = aiJsonResponse.substring(0, aiJsonResponse.length() - 3);
            }

            // 5. Convert the JSON text back into our TranslationResponse Java Object
            return objectMapper.readValue(aiJsonResponse.trim(), TranslationResponse.class);

        } catch (Exception e) {
            e.printStackTrace();
            List<WordMeaning> errors = new ArrayList<>();
            errors.add(new WordMeaning("Error", e.getMessage()));
            return new TranslationResponse("AI API Error", "AI API Error", errors);
        }
    }
}
